const MAP_PARAMS = [
  'lat',
  'lng',
  'zoom',
  'year',
  'span',
  'map',
  'person',
  'place',
  'scope',
  'route',
  'hide',
  'events',
]

const TIMELINE_PARAMS = [
  'from',
  'to',
  'type',
  'person',
  'place',
  'scope',
  'placeScope',
  'selected',
]

function numberParam(params, name) {
  const raw = params.get(name)
  if (raw == null || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function listParam(params, name) {
  return (params.get(name) || '').split(',').filter(Boolean)
}

function setParam(params, name, value, defaultValue = null) {
  if (value == null || value === '' || value === defaultValue) return
  params.set(name, String(value))
}

function setListParam(params, name, values) {
  if (values?.length) params.set(name, values.join(','))
}

function cleanParams(url, names) {
  names.forEach(name => url.searchParams.delete(name))
}

function localDate(year, month, day) {
  const date = new Date(0)
  date.setHours(0, 0, 0, 0)
  date.setFullYear(year, month - 1, day)
  return date
}

function parseDate(value) {
  const match = /^(\d{1,6})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!match) return null
  const date = localDate(Number(match[1]), Number(match[2]), Number(match[3]))
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null
  }
  return date
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  const rounded = new Date(date)
  if (rounded.getHours() >= 12) {
    rounded.setDate(rounded.getDate() + 1)
  }
  return `${String(rounded.getFullYear()).padStart(4, '0')}-${String(
    rounded.getMonth() + 1
  ).padStart(2, '0')}-${String(rounded.getDate()).padStart(2, '0')}`
}

export function parseMapUrlState(search) {
  const params = new URLSearchParams(search)
  return {
    latitude: numberParam(params, 'lat'),
    longitude: numberParam(params, 'lng'),
    zoom: numberParam(params, 'zoom'),
    year: numberParam(params, 'year'),
    yearSpan: numberParam(params, 'span'),
    style: params.get('map') || 'base',
    person: params.get('person'),
    place: params.get('place'),
    personScope: params.get('scope') || 'self',
    routeVisible: params.get('route') !== '0',
    hiddenOverlays: listParam(params, 'hide'),
    eventHandles: listParam(params, 'events'),
  }
}

export function mapUrlFromState(urlValue, state) {
  const url = new URL(urlValue, window.location.origin)
  cleanParams(url, MAP_PARAMS)
  setParam(url.searchParams, 'lat', state.latitude)
  setParam(url.searchParams, 'lng', state.longitude)
  setParam(url.searchParams, 'zoom', state.zoom)
  setParam(url.searchParams, 'year', state.year, -1)
  setParam(url.searchParams, 'span', state.yearSpan, -1)
  setParam(url.searchParams, 'map', state.style, 'base')
  setParam(url.searchParams, 'person', state.person)
  setParam(url.searchParams, 'place', state.place)
  setParam(url.searchParams, 'scope', state.personScope, 'self')
  if (state.routeVisible === false) url.searchParams.set('route', '0')
  setListParam(url.searchParams, 'hide', state.hiddenOverlays)
  setListParam(url.searchParams, 'events', state.eventHandles)
  return url
}

export function parseTimelineUrlState(search) {
  const params = new URLSearchParams(search)
  return {
    start: parseDate(params.get('from')),
    end: parseDate(params.get('to')),
    eventType: params.get('type') || '',
    person: params.get('person'),
    place: params.get('place'),
    personScope: params.get('scope') || 'self',
    placeScope: params.get('placeScope') || 'exact',
    selectedEvent: params.get('selected'),
  }
}

export function timelineUrlFromState(urlValue, state) {
  const url = new URL(urlValue, window.location.origin)
  cleanParams(url, TIMELINE_PARAMS)
  setParam(url.searchParams, 'from', formatDate(state.start))
  setParam(url.searchParams, 'to', formatDate(state.end))
  setParam(url.searchParams, 'type', state.eventType)
  setParam(url.searchParams, 'person', state.person)
  setParam(url.searchParams, 'place', state.place)
  setParam(url.searchParams, 'scope', state.personScope, 'self')
  setParam(url.searchParams, 'placeScope', state.placeScope, 'exact')
  setParam(url.searchParams, 'selected', state.selectedEvent)
  return url
}
