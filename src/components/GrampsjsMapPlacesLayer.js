import {LitElement} from 'lit'
import {fireEvent} from '../util.js'
import {
  personRouteColorAt,
  scalePersonRouteRecency,
} from './GrampsjsMapPersonLinesLayer.js'

const SOURCE_ID = 'places'
const LAYER_ID = 'places-layer'
const UNKNOWN_DATE_COLOR = '#8a8a8a'

function eventColors(events, dateRange) {
  const [oldest, newest] = dateRange || []
  return (events || []).map(event => {
    const sortval = event.date?.sortval
    if (
      !Number.isFinite(sortval) ||
      sortval <= 0 ||
      !Number.isFinite(oldest) ||
      !Number.isFinite(newest)
    ) {
      return UNKNOWN_DATE_COLOR
    }
    return personRouteColorAt(scalePersonRouteRecency(sortval, oldest, newest))
  })
}

function iconId(colors) {
  return `place-pie-${colors.map(color => color.slice(1)).join('-')}`
}

export function buildPlaceMarkerGeoJSON(
  places,
  highlightedHandles = [],
  dateRange = null,
  fallbackColor = '#ea4335'
) {
  const anyHighlighted = highlightedHandles.length > 0
  return {
    type: 'FeatureCollection',
    features: (places || []).map(place => {
      const events = [...(place.events || [])].sort(
        (a, b) => (a.date?.sortval || 0) - (b.date?.sortval || 0)
      )
      const colors = eventColors(events, dateRange)
      if (!colors.length) colors.push(fallbackColor)
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(place.long), parseFloat(place.lat)],
        },
        properties: {
          handle: place.handle,
          name: place.name,
          highlighted: highlightedHandles.includes(place.handle),
          anyHighlighted,
          icon: iconId(colors),
          colors: JSON.stringify(colors),
          eventHandles: JSON.stringify(
            [...new Set(events.map(event => event.handle))].filter(Boolean)
          ),
        },
      }
    }),
  }
}

class GrampsjsMapPlacesLayer extends LitElement {
  static get properties() {
    return {
      places: {type: Array},
      highlightedHandles: {type: Array},
      dateRange: {type: Array},
    }
  }

  constructor() {
    super()
    this.places = []
    this.highlightedHandles = []
    this.dateRange = null
    this._map = null
    this._popup = null
    this._imageIds = new Set()
    this._onStyleLoad = () => this._syncImages()
    this._onClick = event => this._handleClick(event)
    this._onMouseEnter = event => this._handleMouseEnter(event)
    this._onMouseLeave = () => this._handleMouseLeave()
  }

  createRenderRoot() {
    return this
  }

  _layerDef() {
    return {
      id: LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-allow-overlap': true,
        'icon-size': ['case', ['get', 'highlighted'], 1.35, 1],
      },
      paint: {
        'icon-opacity': [
          'case',
          ['get', 'highlighted'],
          1,
          ['case', ['boolean', ['get', 'anyHighlighted'], false], 0.55, 0.92],
        ],
      },
    }
  }

  addToMap(map) {
    this._map = map
    map.off('style.load', this._onStyleLoad)
    map.on('style.load', this._onStyleLoad)
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    this._syncImages()
    map.addSource(SOURCE_ID, {type: 'geojson', data: this._buildGeoJSON()})
    map.addLayer(this._layerDef())
    this._addHandlers()
  }

  getTransformStyleContribution(_prev, next) {
    return {
      ...next,
      sources: {
        ...next.sources,
        [SOURCE_ID]: {type: 'geojson', data: this._buildGeoJSON()},
      },
      layers: [...next.layers, this._layerDef()],
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (!this._map) return
    this._map.off('style.load', this._onStyleLoad)
    this._removeHandlers()
    this._popup?.remove()
    if (this._map.getLayer(LAYER_ID)) this._map.removeLayer(LAYER_ID)
    if (this._map.getSource(SOURCE_ID)) this._map.removeSource(SOURCE_ID)
    this._removeImages()
  }

  updated(changed) {
    if (
      changed.has('places') ||
      changed.has('highlightedHandles') ||
      changed.has('dateRange')
    ) {
      this._updateSource()
    }
  }

  _updateSource() {
    if (!this._map) return
    this._syncImages()
    const source = this._map.getSource(SOURCE_ID)
    if (source) source.setData(this._buildGeoJSON())
    else if (this._map.isStyleLoaded()) this.addToMap(this._map)
  }

  _buildGeoJSON() {
    return buildPlaceMarkerGeoJSON(
      this.places,
      this.highlightedHandles || [],
      this.dateRange,
      this._markerColor()
    )
  }

  _markerColor() {
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue('--grampsjs-map-marker-color')
        .trim() || '#ea4335'
    )
  }

  _syncImages() {
    if (!this._map) return
    for (const feature of this._buildGeoJSON().features) {
      const {icon, colors} = feature.properties
      if (!this._map.hasImage(icon)) {
        this._map.addImage(icon, this._drawPie(JSON.parse(colors)))
      }
      this._imageIds.add(icon)
    }
  }

  _drawPie(colors) {
    const size = 28
    const center = size / 2
    const radius = 10.5
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    colors.forEach((color, index) => {
      const start = -Math.PI / 2 + (index * Math.PI * 2) / colors.length
      const end = -Math.PI / 2 + ((index + 1) * Math.PI * 2) / colors.length
      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, radius, start, end)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
    })
    ctx.beginPath()
    ctx.arc(center, center, radius, 0, Math.PI * 2)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
    return ctx.getImageData(0, 0, size, size)
  }

  _removeImages() {
    for (const id of this._imageIds) {
      if (this._map.hasImage(id)) this._map.removeImage(id)
    }
    this._imageIds.clear()
  }

  _addHandlers() {
    this._removeHandlers()
    this._popup = new window.maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 15,
      className: 'grampsjs-place-tooltip',
    })
    this._map.on('click', LAYER_ID, this._onClick)
    this._map.on('mouseenter', LAYER_ID, this._onMouseEnter)
    this._map.on('mouseleave', LAYER_ID, this._onMouseLeave)
  }

  _removeHandlers() {
    if (!this._map) return
    this._map.off('click', LAYER_ID, this._onClick)
    this._map.off('mouseenter', LAYER_ID, this._onMouseEnter)
    this._map.off('mouseleave', LAYER_ID, this._onMouseLeave)
  }

  _handleClick(event) {
    const feature = event.features?.[0]
    if (!feature) return
    event.originalEvent?.stopPropagation()
    fireEvent(this, 'map:marker-clicked', {
      handle: feature.properties.handle,
      name: feature.properties.name,
      eventHandles: JSON.parse(feature.properties.eventHandles || '[]'),
    })
  }

  _handleMouseEnter(event) {
    this._map.getCanvas().style.cursor = 'pointer'
    const feature = event.features?.[0]
    if (!feature || feature.properties.highlighted) return
    this._popup
      .setLngLat(feature.geometry.coordinates.slice())
      .setText(feature.properties.name)
      .addTo(this._map)
  }

  _handleMouseLeave() {
    this._map.getCanvas().style.cursor = ''
    this._popup.remove()
  }
}

window.customElements.define(
  'grampsjs-map-places-layer',
  GrampsjsMapPlacesLayer
)
