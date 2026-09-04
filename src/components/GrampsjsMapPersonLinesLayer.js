import {LitElement} from 'lit'
import {fireEvent, getGregorianYears} from '../util.js'

const SOURCE_ID = 'person-lines'
const LAYER_ID = 'person-lines-layer'
const ARROWS_LAYER_ID = 'person-lines-arrows'
const ARROW_IMAGE_ID = 'person-line-arrow'
export const PERSON_ROUTE_HANDLE = 'person-life-event-route'

export const PERSON_ROUTE_COLOR_STOPS = [
  [0, '#3b4cc0'],
  [0.25, '#00a6ca'],
  [0.5, '#40b0a6'],
  [0.75, '#f6c85f'],
  [1, '#b2182b'],
]

const RECENCY_COLOR = [
  'interpolate',
  ['linear'],
  ['get', 'recency'],
  ...PERSON_ROUTE_COLOR_STOPS.flat(),
]

const RECENCY_EXPONENT = 2

export const PERSON_ROUTE_COLOR_GRADIENT = `linear-gradient(to right, ${PERSON_ROUTE_COLOR_STOPS.map(
  ([position, color]) => `${color} ${position * 100}%`
).join(', ')})`

function dateYearInfo(date) {
  if (!Array.isArray(date?.dateval)) return {}
  const [startYear, endYear] = getGregorianYears(date)
  if (!Number.isFinite(startYear)) return {}
  const lastYear = Number.isFinite(endYear) ? endYear : startYear
  let label =
    startYear === lastYear ? String(startYear) : `${startYear}–${lastYear}`
  if (date.modifier === 1 || date.modifier === 8) label = `≤ ${label}`
  if (date.modifier === 2 || date.modifier === 7) label = `≥ ${label}`
  if (date.modifier === 3 || date.quality === 1) label = `ca. ${label}`
  return {
    year: (startYear + lastYear) / 2,
    label,
  }
}

export function scalePersonRouteRecency(value, oldest, newest) {
  if (newest === oldest) return 1
  const linear = (value - oldest) / (newest - oldest)
  return linear ** RECENCY_EXPONENT
}

function hexToRgb(color) {
  return [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16))
}

export function personRouteColorAt(recency) {
  const value = Math.max(0, Math.min(1, recency))
  const upperIndex = PERSON_ROUTE_COLOR_STOPS.findIndex(
    ([position]) => position >= value
  )
  if (upperIndex <= 0) return PERSON_ROUTE_COLOR_STOPS[0][1]
  const [upperPosition, upperColor] = PERSON_ROUTE_COLOR_STOPS[upperIndex]
  const [lowerPosition, lowerColor] = PERSON_ROUTE_COLOR_STOPS[upperIndex - 1]
  const ratio = (value - lowerPosition) / (upperPosition - lowerPosition)
  const lowerRgb = hexToRgb(lowerColor)
  const upperRgb = hexToRgb(upperColor)
  const rgb = lowerRgb.map((channel, index) =>
    Math.round(channel + (upperRgb[index] - channel) * ratio)
  )
  return `#${rgb
    .map(channel => channel.toString(16).padStart(2, '0'))
    .join('')}`
}

export function personRouteLegendTicks(oldest, newest, count = 5) {
  if (!Number.isFinite(oldest) || !Number.isFinite(newest)) return []
  if (oldest === newest) return [{position: 1, year: Math.round(newest)}]
  return Array.from({length: count}, (_, index) => {
    const position = index / (count - 1)
    const linear = position ** (1 / RECENCY_EXPONENT)
    return {
      position,
      year: Math.round(oldest + (newest - oldest) * linear),
    }
  }).filter(
    (tick, index, ticks) => index === 0 || tick.year !== ticks[index - 1].year
  )
}

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
      const yearInfo = dateYearInfo(event.date)
      return {
        coords: [parseFloat(place.long), parseFloat(place.lat)],
        handle: event.handle,
        sortval: event.date.sortval,
        year: yearInfo.year,
        yearLabel: yearInfo.label,
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
        fromYear: stops[index].year,
        toYear: stop.year,
        time: stop.yearLabel,
        eventHandles: JSON.stringify(
          [stops[index].handle, stop.handle].filter(Boolean)
        ),
      },
    })),
  }
}

export function buildPersonRoutesGeoJSON(
  eventGroups,
  places,
  dateRange = null
) {
  const segments = new Map()
  const groups = eventGroups || []
  groups.forEach((events, route) => {
    buildPersonRouteGeoJSON(events, places).features.forEach(feature => {
      const key = JSON.stringify(feature.geometry.coordinates)
      const existing = segments.get(key)
      if (existing) {
        existing.properties.travelerCount += 1
        existing.properties.eventHandles = JSON.stringify([
          ...new Set([
            ...JSON.parse(existing.properties.eventHandles),
            ...JSON.parse(feature.properties.eventHandles),
          ]),
        ])
        if (feature.properties.toSortval > existing.properties.toSortval) {
          Object.assign(existing.properties, {
            fromSortval: feature.properties.fromSortval,
            toSortval: feature.properties.toSortval,
            fromYear: feature.properties.fromYear,
            toYear: feature.properties.toYear,
            time: feature.properties.time,
          })
        }
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
  const features = [...segments.values()]
  const arrivalDates = features.map(feature => feature.properties.toSortval)
  const oldest = dateRange?.[0] ?? Math.min(...arrivalDates)
  const newest = dateRange?.[1] ?? Math.max(...arrivalDates)
  for (const feature of features) {
    feature.properties.recency =
      newest === oldest
        ? 1
        : scalePersonRouteRecency(feature.properties.toSortval, oldest, newest)
  }
  return {
    type: 'FeatureCollection',
    features,
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
      dateRange: {type: Array},
    }
  }

  constructor() {
    super()
    this.events = []
    this.eventGroups = []
    this.places = []
    this.visible = true
    this.handle = PERSON_ROUTE_HANDLE
    this.dateRange = null
    this._map = null
    this._popup = null
    // Re-add the arrow image after every style swap (images don't survive setStyle).
    this._onStyleLoad = () => this._addArrowImage()
    this._onArrowEnter = event => this._showTimePopup(event)
    this._onArrowMove = event => this._moveTimePopup(event)
    this._onArrowLeave = () => this._hideTimePopup()
    this._onArrowClick = event => this._handleArrowClick(event)
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
    this._addHoverHandlers()
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
      this._removeHoverHandlers()
      this._popup?.remove()
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
      changed.has('places') ||
      changed.has('dateRange')
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

  _addHoverHandlers() {
    this._removeHoverHandlers()
    this._map.on('mouseenter', ARROWS_LAYER_ID, this._onArrowEnter)
    this._map.on('mousemove', ARROWS_LAYER_ID, this._onArrowMove)
    this._map.on('mouseleave', ARROWS_LAYER_ID, this._onArrowLeave)
    this._map.on('click', ARROWS_LAYER_ID, this._onArrowClick)
  }

  _removeHoverHandlers() {
    if (!this._map) return
    this._map.off('mouseenter', ARROWS_LAYER_ID, this._onArrowEnter)
    this._map.off('mousemove', ARROWS_LAYER_ID, this._onArrowMove)
    this._map.off('mouseleave', ARROWS_LAYER_ID, this._onArrowLeave)
    this._map.off('click', ARROWS_LAYER_ID, this._onArrowClick)
  }

  _showTimePopup(event) {
    const text = event.features?.[0]?.properties?.time
    if (!text) return
    this._map.getCanvas().style.cursor = 'pointer'
    if (!this._popup) {
      this._popup = new window.maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 14,
        className: 'grampsjs-route-time-tooltip',
      })
    }
    this._popup.setLngLat(event.lngLat).setText(text).addTo(this._map)
  }

  _moveTimePopup(event) {
    if (this._popup?.isOpen()) this._popup.setLngLat(event.lngLat)
  }

  _hideTimePopup() {
    if (this._map) this._map.getCanvas().style.cursor = ''
    this._popup?.remove()
  }

  _handleArrowClick(event) {
    const feature = event.features?.[0]
    if (!feature) return
    event.originalEvent?.stopPropagation()
    fireEvent(this, 'map:route-clicked', {
      eventHandles: JSON.parse(feature.properties.eventHandles || '[]'),
      time: feature.properties.time || '',
    })
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
    return buildPersonRoutesGeoJSON(groups, this.places, this.dateRange)
  }

  _linePaint() {
    return {
      'line-color': RECENCY_COLOR,
      'line-width': 3,
      'line-opacity': 0.85,
    }
  }
}

window.customElements.define(
  'grampsjs-map-person-lines-layer',
  GrampsjsMapPersonLinesLayer
)
