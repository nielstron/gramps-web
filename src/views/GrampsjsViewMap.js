import {html, css} from 'lit'
import '@material/mwc-textfield'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsMap.js'
import {
  buildPersonEventGroups,
  buildPersonRoutesGeoJSON,
  PERSON_ROUTE_COLOR_GRADIENT,
  PERSON_ROUTE_HANDLE,
  personRouteLegendTicks,
} from '../components/GrampsjsMapPersonLinesLayer.js'
import '../components/GrampsjsMapPlacesLayer.js'
import {
  DEFAULT_SEARCH_FILTER,
  TYPE_EXTERNAL,
  TYPE_PERSON,
} from '../components/GrampsjsMapSearchbox.js'
import '../components/GrampsjsMapTimeSlider.js'
import '../components/GrampsjsPlaceBox.js'
import '../components/GrampsjsPersonBox.js'
import '../components/GrampsjsMapTileLayer.js'
import {
  isDateBetweenYears,
  getGregorianYears,
  personProfileDisplayName,
  fireEvent,
} from '../util.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import {queryNominatim, getMapViewport, saveMapViewport} from '../api.js'
import {
  PERSON_SCOPE_SELF,
  personScopeOptions,
  personScopeRules,
} from '../personScope.js'
import {formatDateString} from '../date.js'
import {mapUrlFromState, parseMapUrlState} from '../viewUrlState.js'

const EMPTY_ARRAY = []

const DEFAULT_CENTER = [20, 0]
const DEFAULT_ZOOM = 2

export class GrampsjsViewMap extends GrampsjsStaleDataMixin(GrampsjsView) {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
          margin-top: -4px;
        }

        .person-scope {
          display: block;
          margin: 12px 16px 0;
        }

        .map-event-list-title {
          margin: 12px 16px 4px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .map-event-list {
          max-height: min(46vh, 440px);
          overflow: auto;
        }

        .person-route-legend {
          position: absolute;
          z-index: 2;
          bottom: 44px;
          left: 50%;
          transform: translateX(-50%);
          width: min(420px, calc(100% - 120px));
          box-sizing: border-box;
          padding: 6px 10px 5px;
          border-radius: 10px;
          background: var(--md-sys-color-surface-container-high);
          background: color-mix(
            in srgb,
            var(--md-sys-color-surface-container-high) 92%,
            transparent
          );
          color: var(--md-sys-color-on-surface);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.24);
          pointer-events: none;
        }

        .person-route-legend-title {
          margin-bottom: 3px;
          font-size: 11px;
          font-weight: 600;
          line-height: 13px;
        }

        .person-route-legend-bar {
          height: 8px;
          border: 1px solid rgba(0, 0, 0, 0.24);
          border-radius: 4px;
        }

        .person-route-legend-ticks {
          position: relative;
          height: 14px;
          margin-top: 1px;
          font-size: 10px;
          line-height: 14px;
        }

        .person-route-legend-tick {
          position: absolute;
          transform: translateX(-50%);
          white-space: nowrap;
        }

        .person-route-legend-tick:first-child {
          transform: none;
        }

        .person-route-legend-tick:last-child {
          transform: translateX(-100%);
        }

        @media (max-width: 600px) {
          .person-route-legend {
            width: calc(100% - 32px);
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      _dataPlaces: {type: Array},
      _dataEvents: {type: Array},
      _dataFamilies: {type: Array},
      _filteredPlaces: {type: Array},
      _handlesHighlight: {type: Array},
      _dataLayers: {type: Array},
      _selected: {type: String},
      _valueSearch: {type: String},
      _searchFilter: {type: String},
      _selectedPerson: {type: Object},
      _bounds: {type: Object},
      _year: {type: Number},
      _yearSpan: {type: Number},
      _currentLayer: {type: String},
      _minYear: {type: Number},
      _hiddenOverlaysHandles: {type: Array},
      _personPlaceHandles: {type: Array},
      _selectedPersonData: {type: Object},
      _showPersonRoute: {type: Boolean},
      _personFilterMode: {type: String},
      _personEventGroups: {type: Array},
      _mapEventDetails: {type: Array},
      _mapEventsLoading: {type: Boolean},
    }
  }

  constructor() {
    super()
    const urlState = parseMapUrlState(window.location.search)
    this._dataPlaces = []
    this._dataEvents = []
    this._dataFamilies = []
    this._filteredPlaces = []
    this._handlesHighlight = []
    this._dataLayers = []
    this._hiddenOverlaysHandles = []
    this._personPlaceHandles = []
    this._selected = ''
    this._valueSearch = ''
    this._searchFilter = DEFAULT_SEARCH_FILTER
    this._selectedPerson = null
    this._selectedPersonData = null
    this._showPersonRoute = true
    this._personFilterMode = PERSON_SCOPE_SELF
    this._personEventGroups = []
    this._scopePeople = null
    // Intentionally non-reactive: only read on filter-change events, never
    // needs to trigger a re-render on its own.
    this._activeSearchQuery = ''
    this._bounds = {}
    this._year = urlState.year ?? new Date().getFullYear() - 50
    this._yearSpan = urlState.yearSpan ?? 50
    this._currentLayer = urlState.style
    this._minYear = 1500
    this._pendingPlace = null
    this._pendingPerson = null
    this._selectedPlace = null
    this._showPersonRoute = urlState.routeVisible
    this._hiddenOverlaysHandles = urlState.hiddenOverlays
    this._personFilterMode = urlState.personScope
    this._mapEventHandles = urlState.eventHandles
    this._mapEventDetails = []
    this._mapEventTitle = ''
    this._mapEventsLoading = false
    this._urlViewport =
      urlState.latitude != null &&
      urlState.longitude != null &&
      urlState.zoom != null
        ? {
            lat: urlState.latitude,
            lng: urlState.longitude,
            zoom: urlState.zoom,
          }
        : null
    // MapLibre emits an initial moveend before the async URL selection has
    // been restored. Keep that event from erasing person/place parameters.
    this._suppressUrlWrites = true
  }

  get _searchbox() {
    return this.renderRoot?.querySelector('grampsjs-map-searchbox')
  }

  connectedCallback() {
    super.connectedCallback()
    this._boundPlaceSelected = e => this._handleExternalPlaceSelected(e)
    this._boundPersonSelected = e => this._handleExternalPersonSelected(e)
    this._boundPlaceActive = e => {
      this._handlesHighlight = e.detail.handle ? [e.detail.handle] : []
    }
    window.addEventListener('map:place-selected', this._boundPlaceSelected)
    window.addEventListener('map:person-selected', this._boundPersonSelected)
    window.addEventListener('map:place-active', this._boundPlaceActive)
    this._boundPopState = () => this._restoreMapUrlState()
    window.addEventListener('popstate', this._boundPopState)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('map:place-selected', this._boundPlaceSelected)
    window.removeEventListener('map:person-selected', this._boundPersonSelected)
    window.removeEventListener('map:place-active', this._boundPlaceActive)
    window.removeEventListener('popstate', this._boundPopState)
    clearTimeout(this._urlTimer)
  }

  _handleExternalPlaceSelected({detail}) {
    this._pendingPlace = detail
    this._applyPendingPlace()
  }

  _applyPendingPlace() {
    if (!this._pendingPlace) return
    if (!this._mapEl?._map) {
      requestAnimationFrame(() => this._applyPendingPlace())
      return
    }
    const place = this._pendingPlace
    this._pendingPlace = null
    // Defer one frame so the browser has computed layout after display:none →
    // display:block, then resize before flyTo so MapLibre knows its dimensions.
    requestAnimationFrame(() => {
      this._mapEl._map.resize()
      this._handlePlaceSelected(place)
    })
  }

  _handleExternalPersonSelected({detail: {person}}) {
    this._pendingPerson = person
    this._applyPendingPerson()
  }

  _applyPendingPerson() {
    if (!this._pendingPerson) return
    if (!this._mapEl?._map) {
      requestAnimationFrame(() => this._applyPendingPerson())
      return
    }
    const person = this._pendingPerson
    this._pendingPerson = null
    requestAnimationFrame(() => {
      this._mapEl._map.resize()
      this._handlePersonSelected(person)
    })
  }

  // eslint-disable-next-line class-methods-use-this
  _hasCoords(obj) {
    const lat = parseFloat(obj?.profile?.lat)
    const long = parseFloat(obj?.profile?.long)
    return (
      obj?.profile?.lat != null &&
      !Number.isNaN(lat) &&
      obj?.profile?.long != null &&
      !Number.isNaN(long) &&
      !(lat === 0 && long === 0)
    )
  }

  get _placesForMap() {
    const highlightedHandles = new Set(this._handlesHighlight)
    const toMapPlace = obj => ({
      handle: obj.handle,
      name: obj.profile.name,
      lat: obj.profile.lat,
      long: obj.profile.long,
      events: this._eventsForPlace(obj),
    })

    if (this._selectedPerson) {
      const personHandles = new Set(this._personPlaceHandles)
      return this._dataPlaces
        .filter(
          place => personHandles.has(place.handle) && this._hasCoords(place)
        )
        .map(toMapPlace)
    }

    const filteredHandles = new Set(
      this._filteredPlaces.map(place => place.handle)
    )
    const highlightedFilteredPlaces = this._dataPlaces.filter(
      place =>
        highlightedHandles.has(place.handle) &&
        !filteredHandles.has(place.handle)
    )
    return [...this._filteredPlaces, ...highlightedFilteredPlaces]
      .filter(p => this._hasCoords(p))
      .map(toMapPlace)
  }

  _eventsForPlace(place) {
    const events = this._selectedPerson
      ? this._personEventGroups
          .flat()
          .filter(event => event.place === place.handle)
      : (place.backlinks?.event || [])
          .map(handle =>
            this._dataEvents.find(event => event.handle === handle)
          )
          .filter(Boolean)
          .filter(event => {
            if (this._year <= 0 || this._yearSpan <= 0) return true
            return isDateBetweenYears(
              event.date,
              this._year - this._yearSpan,
              this._year + this._yearSpan
            )
          })
    const seen = new Set()
    return events.filter(event => {
      if (!event.handle || seen.has(event.handle)) return false
      seen.add(event.handle)
      return true
    })
  }

  get _mapDateRange() {
    const sortvals = this._placesForMap
      .flatMap(place => place.events)
      .map(event => event.date?.sortval)
      .filter(sortval => Number.isFinite(sortval) && sortval > 0)
    return sortvals.length
      ? [Math.min(...sortvals), Math.max(...sortvals)]
      : null
  }

  get _mapYearRange() {
    const years = this._placesForMap
      .flatMap(place => place.events)
      .flatMap(event => getGregorianYears(event.date))
      .filter(Number.isFinite)
    return years.length ? [Math.min(...years), Math.max(...years)] : null
  }

  renderContent() {
    const center = this._getMapCenter()
    const saved = getMapViewport()
    const zoom = this._urlViewport?.zoom ?? saved?.zoom ?? DEFAULT_ZOOM
    return html`
      <grampsjs-map
        .appState="${this.appState}"
        layerSwitcher
        locateControl
        width="100%"
        height="calc(100vh - 64px - 36px)"
        latitude="${center[0]}"
        longitude="${center[1]}"
        year="${this._year}"
        .mapStyle="${this._currentLayer || 'base'}"
        mapid="map-mapview"
        .overlays="${this._getOverlaysForLayerSwitcher()}"
        @map:layerchange="${this._handleLayerChange}"
        @map:moveend="${this._handleMoveEnd}"
        @map:overlay-toggle="${this._handleOverlayToggle}"
        @map:marker-clicked="${this._handleMapMarkerClicked}"
        @map:route-clicked="${this._handleMapRouteClicked}"
        id="map"
        zoom="${zoom}"
        >${this._renderLayers()}
        <grampsjs-map-person-lines-layer
          .eventGroups="${this._personEventGroups}"
          .places="${this._selectedPersonData ? this._dataPlaces : EMPTY_ARRAY}"
          .visible="${this._showPersonRoute}"
          .dateRange="${this._mapDateRange}"
        ></grampsjs-map-person-lines-layer>
        <grampsjs-map-places-layer
          .places="${this._placesForMap}"
          .highlightedHandles="${this._handlesHighlight}"
          .dateRange="${this._mapDateRange}"
        ></grampsjs-map-places-layer
      ></grampsjs-map>
      ${this._renderPersonRouteLegend()}
      <grampsjs-map-searchbox
        @mapsearch:input="${this._handleSearchInput}"
        @mapsearch:clear="${this._handleSearchClear}"
        @mapsearch:selected="${this._handleSearchSelected}"
        @mapsearch:filter-change="${this._handleSearchFilterChange}"
        @searchbox:timechip-clear="${this._handleTimechipClear}"
        .appState="${this.appState}"
        year="${this._selectedPerson ? -1 : this._year}"
        yearSpan="${this._selectedPerson ? -1 : this._yearSpan}"
        value="${this._valueSearch}"
        >${this._renderPlaceDetails()}</grampsjs-map-searchbox
      >
      <grampsjs-map-time-slider
        min="${this._minYear}"
        .value="${this._year}"
        .span="${this._yearSpan}"
        @timeslider:change="${this._handleTimeSliderChange}"
        .appState="${this.appState}"
      ></grampsjs-map-time-slider>
    `
  }

  _personRouteGeoJSON() {
    if (!this._selectedPersonData) {
      return {type: 'FeatureCollection', features: []}
    }
    const eventGroups = this._personEventGroups.length
      ? this._personEventGroups
      : buildPersonEventGroups(
          [this._selectedPersonData],
          this._dataFamilies,
          this._dataEvents
        )
    return buildPersonRoutesGeoJSON(
      eventGroups,
      this._dataPlaces,
      this._mapDateRange
    )
  }

  _renderPersonRouteLegend() {
    const years = this._mapYearRange
    if (!years) return ''
    const ticks = personRouteLegendTicks(years[0], years[1])
    return html`
      <div
        class="person-route-legend"
        role="img"
        aria-label="${this._('Year')}"
      >
        <div class="person-route-legend-title">${this._('Year')}</div>
        <div
          class="person-route-legend-bar"
          style="background:${PERSON_ROUTE_COLOR_GRADIENT}"
        ></div>
        <div class="person-route-legend-ticks">
          ${ticks.map(
            tick => html`
              <span
                class="person-route-legend-tick"
                style="left:${tick.position * 100}%"
                >${tick.year}</span
              >
            `
          )}
        </div>
      </div>
    `
  }

  _renderPlaceDetails() {
    if (this._mapEventHandles.length || this._mapEventsLoading) {
      return this._renderMapEventList()
    }
    if (this._selectedPerson) {
      return this._renderPersonBox()
    }
    if (this._handlesHighlight.length === 0) {
      return ''
    }
    const [handle] = this._handlesHighlight
    if (
      this._dataPlaces.length > 0 &&
      !this._dataPlaces.find(p => p.handle === handle)
    ) {
      this._clearSearchBox()
      return ''
    }
    const name =
      this._dataPlaces.find(p => p.handle === handle)?.profile?.name ?? ''
    return html`
      <grampsjs-place-box
        handle="${handle}"
        name="${name}"
        .appState="${this.appState}"
      ></grampsjs-place-box>
    `
  }

  _renderMapEventList() {
    return html`
      <div class="map-event-list-title">
        ${this._mapEventTitle || this._('Related events')}
      </div>
      <md-list class="map-event-list">
        ${this._mapEventsLoading
          ? html`<md-list-item type="text" noninteractive
              >${this._('Loading')}</md-list-item
            >`
          : this._mapEventDetails.map(event => {
              const profile = event.profile || {}
              const type =
                typeof profile.type === 'string'
                  ? profile.type
                  : profile.type?.string || ''
              return html`
                <md-list-item
                  type="button"
                  @click="${() =>
                    fireEvent(this, 'nav', {
                      path: `event/${event.gramps_id}`,
                    })}"
                >
                  <span slot="headline"
                    >${profile.summary || this._(type) || event.gramps_id}</span
                  >
                  <span slot="supporting-text"
                    >${formatDateString(profile.date)}${profile.place_name
                      ? ` · ${profile.place_name}`
                      : ''}</span
                  >
                </md-list-item>
              `
            })}
      </md-list>
    `
  }

  async _showMapEvents(handles, title = '') {
    this._mapEventHandles = [...new Set(handles || [])].filter(Boolean)
    this._mapEventTitle = title
    this._mapEventDetails = []
    this._mapEventsLoading = this._mapEventHandles.length > 0
    this._searchbox?.showDetails()
    this._writeMapUrl()
    if (!this._mapEventHandles.length) return
    const key = this._mapEventHandles.join(',')
    const locale = this.appState.i18n.lang || 'en'
    const result = await this.appState.apiGet(
      `/api/events/?handles=${encodeURIComponent(
        key
      )}&profile=self&locale=${locale}`
    )
    if (key !== this._mapEventHandles.join(',')) return
    this._mapEventsLoading = false
    if ('data' in result) {
      const order = new Map(
        this._mapEventHandles.map((handle, index) => [handle, index])
      )
      this._mapEventDetails = [...result.data].sort(
        (a, b) =>
          (a.profile?.date?.sortval || 0) - (b.profile?.date?.sortval || 0) ||
          (order.get(a.handle) ?? 0) - (order.get(b.handle) ?? 0)
      )
    }
  }

  _clearMapEvents() {
    this._mapEventHandles = []
    this._mapEventDetails = []
    this._mapEventTitle = ''
    this._mapEventsLoading = false
  }

  _renderPersonBox() {
    const person = this._selectedPerson
    return html`
      <grampsjs-pill-toggle
        class="person-scope"
        .options="${personScopeOptions(value => this._(value))}"
        .selected="${this._personFilterMode}"
        .appState="${this.appState}"
        @pill-toggle:change="${this._handlePersonScopeChange}"
      ></grampsjs-pill-toggle>
      <grampsjs-person-box
        handle="${this._selectedPersonData ? person.handle : ''}"
        name="${personProfileDisplayName(person.profile)}"
        .personData="${this._selectedPersonData}"
        .appState="${this.appState}"
      ></grampsjs-person-box>
    `
  }

  _handleLayerChange(e) {
    this._currentLayer = e.detail.style
    this._writeMapUrl()
  }

  _handleTimechipClear() {
    this.renderRoot.querySelector('grampsjs-map-time-slider')?.reset()
  }

  updated(changed) {
    super.updated(changed)
    if (changed.has('active') && this.active) {
      if (this._mapEl?._map) {
        this._mapEl._map.resize()
      }
      this._applyPendingPlace()
      this._applyPendingPerson()
      this._searchbox?.focus()
    }
  }

  _handleOverlayToggle(event) {
    const {overlay, visible} = event.detail
    if (overlay.handle === PERSON_ROUTE_HANDLE) {
      this._showPersonRoute = visible
      this._writeMapUrl()
      return
    }
    if (visible) {
      this._hiddenOverlaysHandles = [
        ...this._hiddenOverlaysHandles.filter(
          handle => handle !== overlay.handle
        ),
      ]
    } else if (visible === false) {
      this._hiddenOverlaysHandles = [
        ...this._hiddenOverlaysHandles.filter(
          handle => handle !== overlay.handle
        ),
        overlay.handle,
      ]
    }
    this._writeMapUrl()
  }

  _handleTimeSliderChange(event) {
    this._year = event.detail.value
    this._yearSpan = event.detail.span
    this._applyPlaceFilter()
    this._scheduleMapUrlUpdate()
  }

  _handleSearchInput(event) {
    this._activeSearchQuery = event.detail.value
    this._fetchDataSearch(event.detail.value)
  }

  _handleSearchClear() {
    this._nominatimAbort?.abort()
    this.loading = false
    this._valueSearch = ''
    this._activeSearchQuery = ''
    this._searchFilter = DEFAULT_SEARCH_FILTER
    this._handlesHighlight = []
    this._selectedPlace = null
    this._clearMapEvents()
    this._resetPersonScope()
    this._selectedPerson = null
    this._selectedPersonData = null
    this._writeMapUrl()
  }

  _clearSearchBox() {
    this._searchbox?.clear()
  }

  _handleSearchSelected(event) {
    const {object, object_type: objectType} = event.detail
    if (objectType === TYPE_PERSON) {
      this._handlePersonSelected(object)
    } else if (objectType === TYPE_EXTERNAL) {
      this._handleExternalSelected(object)
    } else {
      this._handlePlaceSelected(object)
    }
  }

  _handleExternalSelected(object) {
    const lat = parseFloat(object.lat)
    const lon = parseFloat(object.long)
    if (!isNaN(lat) && !isNaN(lon)) {
      this.flyTo(lat, lon)
    }
    this._activeSearchQuery = ''
    this._valueSearch = object.name || object.display_name || ''
    this._selectedPerson = null
    this._selectedPersonData = null
    this._selectedPlace = null
    this._clearMapEvents()
    this._resetPersonScope()
    this._handlesHighlight = []
    this._writeMapUrl()
  }

  _handlePersonSelected(person) {
    this._activeSearchQuery = ''
    this._valueSearch = personProfileDisplayName(person.profile)
    this._selectedPerson = person
    this._selectedPlace = null
    this._clearMapEvents()
    this._selectedPersonData = null
    this._resetPersonScope()
    this._searchbox?.showDetails()
    const highlighting = this._highlightPersonPlaces(person)
    this._writeMapUrl()
    return highlighting
  }

  _resetPersonScope() {
    this._personScopeSeq = (this._personScopeSeq ?? 0) + 1
    this._personPlaceHandles = []
    this._personEventGroups = []
    this._personFilterMode = PERSON_SCOPE_SELF
    this._scopePeople = null
  }

  async _highlightPersonPlaces(person) {
    const lang = this.appState.i18n.lang || 'en'
    const data = await this.appState.apiGet(
      `/api/people/${person.handle}?extend=all&profile=all&locale=${lang}`
    )
    if (!('data' in data)) {
      this._selectedPerson = null
      return
    }
    if (this._selectedPerson?.handle !== person.handle) return
    const extPerson = data.data
    this._selectedPersonData = extPerson
    this._refreshPersonEventGroups()
    this._handlesHighlight = []
  }

  _refreshPersonEventGroups() {
    const people =
      this._personFilterMode === PERSON_SCOPE_SELF
        ? this._selectedPersonData
          ? [this._selectedPersonData]
          : EMPTY_ARRAY
        : this._scopePeople ?? EMPTY_ARRAY
    this._setPersonEventGroups(
      buildPersonEventGroups(people, this._dataFamilies, this._dataEvents)
    )
  }

  _setPersonEventGroups(eventGroups) {
    this._personEventGroups = eventGroups
    this._personPlaceHandles = [
      ...new Set(
        eventGroups.flatMap(events => events.map(event => event.place))
      ),
    ].filter(Boolean)
    if (!this._skipPersonFit) this._fitPersonPlaces(this._personPlaceHandles)
  }

  async _handlePersonScopeChange(event) {
    const mode = event.detail.value
    this._personFilterMode = mode
    this._scopePeople = null
    this._writeMapUrl()
    if (mode === PERSON_SCOPE_SELF) {
      this._refreshPersonEventGroups()
      return
    }

    const grampsId = this._selectedPerson?.gramps_id
    const rules = personScopeRules(grampsId, mode)
    if (!rules) return
    this._personScopeSeq = (this._personScopeSeq ?? 0) + 1
    const seq = this._personScopeSeq
    const selectedHandle = this._selectedPerson.handle
    const result = await this.appState.apiGet(
      `/api/people/?rules=${encodeURIComponent(
        JSON.stringify(rules)
      )}&keys=handle,event_ref_list,family_list`
    )
    if (
      seq !== this._personScopeSeq ||
      selectedHandle !== this._selectedPerson?.handle ||
      mode !== this._personFilterMode
    ) {
      return
    }
    if ('data' in result) {
      this._scopePeople = result.data
      this._applyScopePeople()
    } else if ('error' in result) {
      this._setPersonEventGroups([])
      fireEvent(this, 'grampsjs:error', {message: result.error})
    }
  }

  _applyScopePeople() {
    if (!this._scopePeople) return
    this._refreshPersonEventGroups()
  }

  _fitPersonPlaces(handles) {
    const handleSet = new Set(handles)
    const places = this._dataPlaces.filter(
      p => handleSet.has(p.handle) && this._hasCoords(p)
    )
    if (places.length === 0) return
    if (places.length === 1) {
      this.flyTo(
        parseFloat(places[0].profile.lat),
        parseFloat(places[0].profile.long)
      )
      return
    }
    const lats = places.map(p => parseFloat(p.profile.lat))
    const lngs = places.map(p => parseFloat(p.profile.long))
    this._mapEl?.fitBounds([
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ])
  }

  _handleSearchFilterChange(event) {
    this._searchFilter = event.detail.filter
    if (this._searchFilter !== TYPE_EXTERNAL) {
      this._nominatimAbort?.abort()
      this.loading = false
    }
    if (this._activeSearchQuery) {
      this._fetchDataSearch(this._activeSearchQuery)
    }
  }

  _handleMapMarkerClicked(e) {
    const place = this._dataPlaces.find(p => p.handle === e.detail.handle)
    if (place) {
      this._handlePlaceSelected(place, {flyTo: false, writeUrl: false})
      this._showMapEvents(e.detail.eventHandles, e.detail.name)
    }
  }

  _handleMapRouteClicked(e) {
    const title = [this._('Related events'), e.detail.time]
      .filter(Boolean)
      .join(' · ')
    this._showMapEvents(e.detail.eventHandles, title)
  }

  _handlePlaceSelected(object, {flyTo = true, writeUrl = true} = {}) {
    this._activeSearchQuery = ''
    this._selectedPerson = null
    this._selectedPersonData = null
    this._selectedPlace = object
    this._clearMapEvents()
    this._resetPersonScope()
    this._valueSearch = object.profile.name
    this._handlesHighlight = [object.handle]
    this._searchbox?.showDetails()
    if (
      flyTo &&
      object.profile.lat != null &&
      object.profile.long != null &&
      !(object.profile.lat === 0 && object.profile.long === 0)
    ) {
      this.flyTo(object.profile.lat, object.profile.long)
    }
    if (writeUrl) this._writeMapUrl()
  }

  get _mapEl() {
    return this.renderRoot.querySelector('grampsjs-map')
  }

  flyTo(latitude, longitude) {
    this._mapEl.flyTo(latitude, longitude)
  }

  panTo(latitude, longitude) {
    this._mapEl.panTo(latitude, longitude)
  }

  setZoom(zoom) {
    this._mapEl._map.setZoom(zoom)
  }

  getZoom() {
    return this._mapEl._map.getZoom()
  }

  _renderLayers() {
    return html` ${this._dataLayers.map(obj => this._renderMapLayer(obj))} `
  }

  _renderMapLayer(obj) {
    const boundsAttr = obj.attribute_list?.find(
      attr => attr.type === 'map:bounds'
    )?.value
    let bounds = null
    if (boundsAttr) {
      try {
        bounds = JSON.parse(boundsAttr)
      } catch {
        bounds = null
      }
    }
    return html`
      <grampsjs-map-tile-layer
        handle="${obj.handle}"
        checksum="${obj.checksum}"
        .bounds="${bounds}"
        ?hidden="${this._hiddenOverlaysHandles.includes(obj.handle)}"
      ></grampsjs-map-tile-layer>
    `
  }

  _getOverlaysForLayerSwitcher() {
    const visibleLayers = this._dataLayers.filter(obj =>
      this._isLayerVisible(
        JSON.parse(
          obj.attribute_list?.filter(attr => attr.type === 'map:bounds')?.[0]
            ?.value
        )
      )
    )
    const overlays = visibleLayers.map(obj => ({
      handle: obj.handle,
      desc: obj.desc,
      visible: !this._hiddenOverlaysHandles.includes(obj.handle),
    }))
    const personRoute = this._personRouteGeoJSON()
    if (personRoute.features.length) {
      overlays.push({
        handle: PERSON_ROUTE_HANDLE,
        desc: this._('Life-event route (blue older → red newer)'),
        visible: this._showPersonRoute,
      })
    }
    return overlays
  }

  _isLayerVisible(bounds) {
    if (Object.keys(this._bounds).length === 0) {
      return false
    }
    const mapBounds = this._bounds
    if (
      bounds[1][0] > mapBounds._sw.lat && // layer south > map south
      bounds[0][0] < mapBounds._ne.lat && // layer north < map north
      bounds[1][1] > mapBounds._sw.lng && // layer east > map west
      bounds[0][1] < mapBounds._ne.lng // layer west < map east
    ) {
      return true
    }
    return false
  }

  _handleMoveEnd(e) {
    this._bounds = e.detail.bounds
    const {center, zoom} = e.detail
    if (center && zoom != null && !this._suppressUrlWrites) {
      saveMapViewport(center.lat, center.lng, zoom)
      this._urlViewport = {lat: center.lat, lng: center.lng, zoom}
      this._scheduleMapUrlUpdate()
    }
  }

  _mapUrlState() {
    const center = this._mapEl?._map?.getCenter()
    const zoom = this._mapEl?._map?.getZoom()
    return {
      latitude: center?.lat ?? this._urlViewport?.lat,
      longitude: center?.lng ?? this._urlViewport?.lng,
      zoom: zoom ?? this._urlViewport?.zoom,
      year: this._year,
      yearSpan: this._yearSpan,
      style: this._currentLayer || 'base',
      person: this._selectedPerson?.gramps_id,
      place: this._selectedPlace?.gramps_id,
      personScope: this._personFilterMode,
      routeVisible: this._showPersonRoute,
      hiddenOverlays: this._hiddenOverlaysHandles,
      eventHandles: this._mapEventHandles,
    }
  }

  _writeMapUrl({replace = false} = {}) {
    if (this._suppressUrlWrites || !window.location.pathname.endsWith('/map')) {
      return
    }
    const url = mapUrlFromState(window.location.href, this._mapUrlState())
    if (url.href === window.location.href) return
    window.history[replace ? 'replaceState' : 'pushState'](
      window.history.state,
      '',
      url
    )
  }

  _scheduleMapUrlUpdate() {
    clearTimeout(this._urlTimer)
    this._urlTimer = setTimeout(() => this._writeMapUrl(), 200)
  }

  async _restoreMapUrlState() {
    if (!window.location.pathname.endsWith('/map')) return
    clearTimeout(this._urlTimer)
    const state = parseMapUrlState(window.location.search)
    this._suppressUrlWrites = true
    try {
      this._year = state.year ?? new Date().getFullYear() - 50
      this._yearSpan = state.yearSpan ?? 50
      this._currentLayer = state.style
      this._showPersonRoute = state.routeVisible
      this._hiddenOverlaysHandles = state.hiddenOverlays
      this._personFilterMode = state.personScope
      this._applyPlaceFilter()
      if (
        state.latitude != null &&
        state.longitude != null &&
        state.zoom != null
      ) {
        this._urlViewport = {
          lat: state.latitude,
          lng: state.longitude,
          zoom: state.zoom,
        }
        this._mapEl?.jumpTo(state.latitude, state.longitude, state.zoom)
      } else {
        this._urlViewport = null
      }
      await this._restoreMapSelection(state)
      if (state.eventHandles.length) {
        await this._showMapEvents(state.eventHandles, this._('Related events'))
      } else {
        this._clearMapEvents()
      }
    } finally {
      this._suppressUrlWrites = false
      this._writeMapUrl({replace: true})
    }
  }

  async _restoreMapSelection(state) {
    const locale = this.appState.i18n.lang || 'en'
    this._skipPersonFit = Boolean(this._urlViewport)
    if (state.person) {
      const result = await this.appState.apiGet(
        `/api/people/?gramps_id=${encodeURIComponent(
          state.person
        )}&profile=self&locale=${locale}`
      )
      const person = result.data?.[0]
      if (person) {
        await this._handlePersonSelected(person)
        if (state.personScope !== PERSON_SCOPE_SELF) {
          await this._handlePersonScopeChange({
            detail: {value: state.personScope},
          })
        }
      }
    } else if (state.place) {
      const result = await this.appState.apiGet(
        `/api/places/?gramps_id=${encodeURIComponent(
          state.place
        )}&profile=self&locale=${locale}`
      )
      const place = result.data?.[0]
      if (place) this._handlePlaceSelected(place, {flyTo: false})
    } else {
      this._selectedPerson = null
      this._selectedPersonData = null
      this._selectedPlace = null
      this._handlesHighlight = []
      this._resetPersonScope()
      this._personFilterMode = state.personScope
    }
    this._skipPersonFit = false
  }

  _applyPlaceFilter() {
    const filterFunction = place => {
      if (this._year > 0 && this._yearSpan > 0) {
        const placeEvents =
          place?.backlinks?.event?.map(handle =>
            this._dataEvents?.find(event => event.handle === handle)
          ) ?? []
        if (placeEvents.length === 0) return false
        const yearMin = this._year - this._yearSpan
        const yearMax = this._year + this._yearSpan
        return placeEvents.some(event =>
          isDateBetweenYears(event?.date, yearMin, yearMax)
        )
      }
      return true
    }
    this._filteredPlaces = [
      ...this._dataPlaces.filter(place => filterFunction(place)),
    ]
  }

  async firstUpdated() {
    const requests = [
      this._fetchPlaces(),
      this._fetchEvents(),
      this._fetchFamilies(),
    ]
    this._fetchDataLayers()
    await Promise.all(requests)
    await this._restoreMapUrlState()
  }

  _fetchDataAll() {
    this._fetchPlaces()
    this._fetchDataLayers()
    this._fetchEvents()
    this._fetchFamilies()
  }

  async _fetchDataSearch(value) {
    if (this._searchFilter === TYPE_EXTERNAL) {
      await this._fetchNominatim(value)
      return
    }
    const typeFilter = this._searchFilter || DEFAULT_SEARCH_FILTER
    const query = encodeURIComponent(
      `${value}*${
        window._oldSearchBackend
          ? ` AND (${typeFilter
              .split(',')
              .map(t => `type:${t}`)
              .join(' OR ')})`
          : ''
      }`
    )
    const locale = this.appState.i18n.lang || 'en'
    const data = await this.appState.apiGet(
      `/api/search/?query=${query}&locale=${locale}&profile=self&page=1&pagesize=20${
        window._oldSearchBackend ? '' : `&type=${typeFilter}`
      }`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._searchbox?.setResults(data.data)
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
      this._searchbox?.setResults([])
    }
  }

  async _fetchNominatim(value) {
    this._nominatimAbort?.abort()
    this._nominatimAbort = new AbortController()
    const lang = (this.appState.i18n.lang || 'en').replaceAll('_', '-')
    try {
      const res = await queryNominatim(value, {
        lang,
        signal: this._nominatimAbort.signal,
      })
      if (res.error) {
        this.error = true
        this._errorMessage =
          res.status === 429
            ? this._('Too many requests. Please try again later.')
            : this._('External search failed')
        this._searchbox?.setResults([])
      } else {
        this.error = false
        this._searchbox?.setResults(
          res.data.map(r => ({
            object_type: TYPE_EXTERNAL,
            object: {
              name: r.name,
              display_name: r.display_name,
              lat: r.lat,
              long: r.lon,
            },
          }))
        )
      }
    } catch (e) {
      return
    }
    this.loading = false
  }

  async _fetchPlaces() {
    const data = await this.appState.apiGet(
      `/api/places/?locale=${
        this.appState.i18n.lang || 'en'
      }&profile=self&backlinks=1&place_hierarchy=0`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._dataPlaces = data.data
      this._applyPlaceFilter()
      if (this._selectedPerson && this._personPlaceHandles.length) {
        this._fitPersonPlaces(this._personPlaceHandles)
      } else if (
        !this._handlesHighlight.length &&
        !getMapViewport() &&
        !this._urlViewport
      ) {
        const center = this._getMapCenter()
        this._mapEl?.jumpTo(center[0], center[1], 6)
      }
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  async _fetchEvents() {
    const data = await this.appState.apiGet(
      '/api/events/?keys=date,handle,place'
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._dataEvents = data.data.filter(event => event.place)
      this._refreshPersonEventGroups()
      this._minYear = this._getMinYear()
      this._applyPlaceFilter()
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  async _fetchFamilies() {
    const data = await this.appState.apiGet(
      '/api/families/?keys=handle,event_ref_list'
    )
    if ('data' in data) {
      this._dataFamilies = data.data
      this._refreshPersonEventGroups()
    } else if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    }
  }

  _getMinYear() {
    const years = this._dataEvents
      ?.filter(event => event.place)
      ?.map(event => getGregorianYears(event.date)?.[0])
      ?.filter(y => y !== undefined)
    let minYear = Math.min(...years)
    const lastYear = new Date().getFullYear() - 1
    minYear = Math.min(minYear, lastYear)
    minYear = Math.max(minYear, 1) // disallow negative
    return minYear
  }

  async _fetchDataLayers() {
    const rules = {
      rules: [
        {
          name: 'HasAttribute',
          values: ['map:bounds', '*'],
          regex: true,
        },
      ],
    }
    const data = await this.appState.apiGet(
      `/api/media/?rules=${encodeURIComponent(JSON.stringify(rules))}`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._dataLayers = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  _getMapCenter() {
    if (this._urlViewport) {
      return [this._urlViewport.lat, this._urlViewport.lng]
    }
    if (this._dataPlaces.length === 0) {
      const saved = getMapViewport()
      return saved ? [saved.lat, saved.lng] : DEFAULT_CENTER
    }
    let x = 0
    let y = 0
    let n = 0
    for (let i = 0; i < this._dataPlaces.length; i += 1) {
      const p = this._dataPlaces[i]
      if (
        p?.profile?.lat !== undefined &&
        p?.profile?.lat !== null &&
        (p?.profile?.lat !== 0 || p?.profile?.long !== 0)
      ) {
        x += p.profile.lat
        y += p.profile.long
        n += 1
      }
    }
    if (n === 0) {
      const saved = getMapViewport()
      return saved ? [saved.lat, saved.lng] : DEFAULT_CENTER
    }
    x /= n
    y /= n
    return [x, y]
  }

  handleUpdateStaleData() {
    this._fetchDataAll()
  }
}

window.customElements.define('grampsjs-view-map', GrampsjsViewMap)
