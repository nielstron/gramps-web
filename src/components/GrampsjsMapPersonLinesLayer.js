import {LitElement} from 'lit'

const SOURCE_ID = 'person-lines'
const LAYER_ID = 'person-lines-layer'
const ARROWS_LAYER_ID = 'person-lines-arrows'
const ARROW_IMAGE_ID = 'person-line-arrow'
export const PERSON_ROUTE_HANDLE = 'person-life-event-route'

const RECENCY_COLOR = [
  'interpolate',
  ['linear'],
  ['get', 'recency'],
  0,
  '#4285f4',
  1,
  '#ea4335',
]

function isComparableEvent(event, placesById) {
  return (
    event?.date?.sortval > 0 &&
    event.date.modifier !== 6 &&
    event.place &&
    placesById[event.place]
  )
}

export function buildPersonRouteGeoJSON(events, places) {
  const placesById = Object.fromEntries(
    (places || [])
      .filter(p => {
        const lat = parseFloat(p?.profile?.lat)
        const lon = parseFloat(p?.profile?.long)
        return (
          !Number.isNaN(lat) && !Number.isNaN(lon) && !(lat === 0 && lon === 0)
        )
      })
      .map(p => [p.handle, p.profile])
  )

  const stops = (events || [])
    .filter(event => isComparableEvent(event, placesById))
    .sort((a, b) => a.date.sortval - b.date.sortval)
    .map(event => {
      const place = placesById[event.place]
      return {
        coords: [parseFloat(place.long), parseFloat(place.lat)],
        sortval: event.date.sortval,
      }
    })
    .filter(
      (stop, index, all) =>
        index === 0 ||
        stop.coords[0] !== all[index - 1].coords[0] ||
        stop.coords[1] !== all[index - 1].coords[1]
    )

  if (stops.length < 2) return {type: 'FeatureCollection', features: []}

  const segmentCount = stops.length - 1
  return {
    type: 'FeatureCollection',
    features: stops.slice(1).map((stop, index) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [stops[index].coords, stop.coords],
      },
      properties: {
        recency: segmentCount === 1 ? 1 : index / (segmentCount - 1),
        fromSortval: stops[index].sortval,
        toSortval: stop.sortval,
      },
    })),
  }
}

export function buildPersonRoutesGeoJSON(eventGroups, places) {
  const segments = new Map()
  const groups = eventGroups || []
  groups.forEach((events, route) => {
    buildPersonRouteGeoJSON(events, places).features.forEach(feature => {
      const key = JSON.stringify(feature.geometry.coordinates)
      const existing = segments.get(key)
      if (existing) {
        existing.properties.travelerCount += 1
        existing.properties.recency = Math.max(
          existing.properties.recency,
          feature.properties.recency
        )
      } else {
        segments.set(key, {
          ...feature,
          properties: {
            ...feature.properties,
            route,
            travelerCount: 1,
          },
        })
      }
    })
  })
  return {
    type: 'FeatureCollection',
    features: [...segments.values()],
  }
}

export function buildPersonEventGroups(people, families, events) {
  const eventsByHandle = new Map(
    (events || []).map(event => [event.handle, event])
  )
  const familiesByHandle = new Map(
    (families || []).map(family => [family.handle, family])
  )

  return (people || []).map(person => {
    const familyObjects = new Map(
      (person.extended?.families || []).map(family => [family.handle, family])
    )
    for (const handle of person.family_list || []) {
      const family = familiesByHandle.get(handle)
      if (family) familyObjects.set(handle, family)
    }

    const eventHandles = [
      ...(person.event_ref_list || []).map(ref => ref.ref),
      ...[...familyObjects.values()].flatMap(family =>
        (family.event_ref_list || []).map(ref => ref.ref)
      ),
    ]
    const personEvents = [...(person.extended?.events || [])]
    const seenHandles = new Set(
      personEvents.map(event => event.handle).filter(Boolean)
    )
    for (const handle of eventHandles) {
      const event = eventsByHandle.get(handle)
      if (event && !seenHandles.has(handle)) {
        personEvents.push(event)
        seenHandles.add(handle)
      }
    }
    return personEvents
  })
}

class GrampsjsMapPersonLinesLayer extends LitElement {
  static get properties() {
    return {
      events: {type: Array},
      eventGroups: {type: Array},
      places: {type: Array},
      visible: {type: Boolean},
      handle: {type: String},
    }
  }

  constructor() {
    super()
    this.events = []
    this.eventGroups = []
    this.places = []
    this.visible = true
    this.handle = PERSON_ROUTE_HANDLE
    this._map = null
    // Re-add the arrow image after every style swap (images don't survive setStyle).
    this._onStyleLoad = () => this._addArrowImage()
  }

  // No shadow DOM — this component renders no UI.
  createRenderRoot() {
    return this
  }

  _lineLayerDef() {
    return {
      id: LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
        visibility: this.visible ? 'visible' : 'none',
      },
      paint: this._linePaint(),
    }
  }

  _arrowsLayerDef() {
    return {
      id: ARROWS_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'symbol-placement': 'line-center',
        'icon-image': ARROW_IMAGE_ID,
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        visibility: this.visible ? 'visible' : 'none',
      },
      paint: {
        'icon-color': RECENCY_COLOR,
        'icon-opacity': 0.9,
      },
    }
  }

  addToMap(map) {
    this._map = map
    map.off('style.load', this._onStyleLoad)
    map.on('style.load', this._onStyleLoad)
    this._addArrowImage()
    if (map.getLayer(ARROWS_LAYER_ID)) map.removeLayer(ARROWS_LAYER_ID)
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    map.addSource(SOURCE_ID, {type: 'geojson', data: this._buildGeoJSON()})
    map.addLayer(this._lineLayerDef())
    map.addLayer(this._arrowsLayerDef())
  }

  getTransformStyleContribution(_prev, next) {
    return {
      ...next,
      sources: {
        ...next.sources,
        [SOURCE_ID]: {type: 'geojson', data: this._buildGeoJSON()},
      },
      layers: [...next.layers, this._lineLayerDef(), this._arrowsLayerDef()],
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this._map) {
      this._map.off('style.load', this._onStyleLoad)
      if (this._map.getLayer(ARROWS_LAYER_ID))
        this._map.removeLayer(ARROWS_LAYER_ID)
      if (this._map.getLayer(LAYER_ID)) this._map.removeLayer(LAYER_ID)
      if (this._map.getSource(SOURCE_ID)) this._map.removeSource(SOURCE_ID)
      if (this._map.hasImage(ARROW_IMAGE_ID))
        this._map.removeImage(ARROW_IMAGE_ID)
    }
  }

  updated(changed) {
    if (changed.has('visible')) this._updateVisibility()
    if (
      changed.has('events') ||
      changed.has('eventGroups') ||
      changed.has('places')
    ) {
      this._updateSource()
    }
  }

  _updateVisibility() {
    if (!this._map) return
    const visibility = this.visible ? 'visible' : 'none'
    if (this._map.getLayer(LAYER_ID)) {
      this._map.setLayoutProperty(LAYER_ID, 'visibility', visibility)
    }
    if (this._map.getLayer(ARROWS_LAYER_ID)) {
      this._map.setLayoutProperty(ARROWS_LAYER_ID, 'visibility', visibility)
    }
  }

  _updateSource() {
    if (!this._map) return
    const source = this._map.getSource(SOURCE_ID)
    if (source) {
      source.setData(this._buildGeoJSON())
    } else if (this._map.isStyleLoaded()) {
      this.addToMap(this._map)
    }
  }

  // Draw a filled right-pointing triangle as a white SDF image so MapLibre can
  // tint it via icon-color at render time.
  _addArrowImage() {
    if (!this._map || this._map.hasImage(ARROW_IMAGE_ID)) return
    const canvas = document.createElement('canvas')
    canvas.width = 22
    canvas.height = 18
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(2, 2)
    ctx.lineTo(20, 9)
    ctx.lineTo(2, 16)
    ctx.closePath()
    ctx.fill()
    this._map.addImage(ARROW_IMAGE_ID, ctx.getImageData(0, 0, 22, 18), {
      sdf: true,
    })
  }

  _buildGeoJSON() {
    const groups = this.eventGroups.length ? this.eventGroups : [this.events]
    return buildPersonRoutesGeoJSON(groups, this.places)
  }

  _linePaint() {
    return {
      'line-color': RECENCY_COLOR,
      'line-width': 3,
      'line-opacity': [
        'interpolate',
        ['linear'],
        ['get', 'recency'],
        0,
        0.5,
        1,
        0.9,
      ],
    }
  }
}

window.customElements.define(
  'grampsjs-map-person-lines-layer',
  GrampsjsMapPersonLinesLayer
)
