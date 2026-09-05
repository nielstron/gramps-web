import {css, html} from 'lit'
import '@material/web/button/outlined-button.js'
import '@material/web/tabs/tabs.js'
import '@material/web/tabs/primary-tab.js'
import {mdiDeleteSweep} from '@mdi/js'

import {GrampsjsView} from './GrampsjsView.js'
import {getRecentObjects, setRecentObjects} from '../api.js'
import '../components/GrampsjsSearchResultList.js'
import '../components/GrampsjsIcon.js'
import './GrampsjsViewRevisions.js'
import {fireEvent} from '../util.js'

export class GrampsjsViewRecentObject extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        md-tabs {
          margin-bottom: 24px;
          width: max-content;
          max-width: 100%;
        }

        md-primary-tab {
          flex: 0 0 auto;
          width: auto;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _data: {type: Array},
      _searchResult: {type: Array},
      _isStale: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._searchResult = []
    this._data = []
    this._isStale = false
  }

  connectedCallback() {
    super.connectedCallback()
    this._boundHandleEvent = this._handleEvent.bind(this)
    window.addEventListener('object:loaded', this._boundHandleEvent)
    this._boundStorageHandler = this._handleStorage.bind(this)
    window.addEventListener('storage', this._boundStorageHandler)
    this._handleStorage()
  }

  _handleStorage() {
    const recentObjects = getRecentObjects()
    if (recentObjects !== undefined && recentObjects !== null) {
      this._data = recentObjects
      if (this._hasFirstUpdated) {
        this._fetchData(this.appState.i18n.lang)
      }
    }
  }

  _handleEvent(event) {
    this._data = this._data.filter(
      obj =>
        obj.grampsId !== event.detail.grampsId ||
        obj.className !== event.detail.className
    )
    this._data.push(event.detail)
    this._data = this._data.slice(-20)
    setRecentObjects(this._data)
    if (this.active) {
      this._fetchData(this.appState.i18n.lang)
    } else {
      this._isStale = true
    }
  }

  _handleClear() {
    this._data = []
    setRecentObjects(this._data)
  }

  render() {
    const canSeeEdits = this.appState.permissions.canViewPrivate
    const edited = canSeeEdits && this.appState.path.pageId === 'edited'
    return html`
      <h2>${this._('History')}</h2>
      <md-tabs .activeTabIndex=${edited ? 1 : 0}>
        <md-primary-tab @click=${() => this._selectTab('recent')}>
          ${this._('Recently browsed')}
        </md-primary-tab>
        ${canSeeEdits
          ? html`
              <md-primary-tab @click=${() => this._selectTab('recent/edited')}>
                ${this._('Recently edited')}
              </md-primary-tab>
            `
          : ''}
      </md-tabs>
      ${edited
        ? html`
            <grampsjs-view-revisions
              embedded
              active
              .appState=${this.appState}
            ></grampsjs-view-revisions>
          `
        : this._renderRecentlyBrowsed()}
    `
  }

  _renderRecentlyBrowsed() {
    return html`<md-outlined-button
        class="float-right"
        @click="${this._handleClear}"
        ?disabled=${this._data.length === 0}
      >
        <grampsjs-icon
          slot="icon"
          path="${mdiDeleteSweep}"
          color="var(--md-outlined-button-label-text-color, var(--md-sys-color-primary))"
          height="20"
          width="20"
        ></grampsjs-icon>
        ${this._('Clear _All')}
      </md-outlined-button>
      ${this._data.length === 0
        ? html` <p>${this._('None')}.</p> `
        : html`
            <grampsjs-search-result-list
              .data="${this._searchResult.slice().reverse()}"
              .appState="${this.appState}"
              large
              noSep
              linked
            ></grampsjs-search-result-list>
          `}`
  }

  _selectTab(path) {
    fireEvent(this, 'nav', {path})
  }

  async _fetchData(lang) {
    if (this._data.length === 0) {
      this._searchResult = []
      return
    }
    this.loading = true
    const query = this._data
      .map(obj => obj.grampsId.trim().replace(/\s\s+/g, ' OR '))
      .filter(grampsId => grampsId && grampsId.trim())
      .join(' OR ')
    const data = await this.appState.apiGet(
      `/api/search/?query=${query}&locale=${
        lang || 'en'
      }&profile=all&page=1&pagesize=100`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      const dataObject = data.data.reduce((obj, item) => {
        // eslint-disable-next-line no-param-reassign
        obj[item?.object?.gramps_id] = item
        return obj
      }, {})
      this._searchResult = this._data
        .map(obj => dataObject[obj.grampsId])
        .filter(obj => obj !== undefined)
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  _onLangChanged(lang) {
    this._fetchData(lang)
  }

  updated(changed) {
    super.updated(changed)
    if (changed.has('active') && this.active && this._isStale) {
      this._fetchData(this.appState.i18n.lang)
      this._isStale = false
    }
  }
}

window.customElements.define('grampsjs-view-recent', GrampsjsViewRecentObject)
