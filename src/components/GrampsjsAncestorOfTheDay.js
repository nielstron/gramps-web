import {html} from 'lit'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import './GrampsjsSearchResultList.js'

export class GrampsjsAncestorOfTheDay extends GrampsjsConnectedComponent {
  static get properties() {
    return {homePersonHandle: {type: String}, _day: {state: true}}
  }

  constructor() {
    super()
    this.homePersonHandle = ''
    this._checkDay = () => {
      const now = new Date()
      this._day = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-')
      clearTimeout(this._midnightTimer)
      const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      )
      this._midnightTimer = setTimeout(this._checkDay, midnight - now + 100)
    }
  }

  connectedCallback() {
    super.connectedCallback()
    this._checkDay()
    document.addEventListener('visibilitychange', this._checkDay)
  }

  disconnectedCallback() {
    clearTimeout(this._midnightTimer)
    document.removeEventListener('visibilitychange', this._checkDay)
    super.disconnectedCallback()
  }

  getUrl() {
    if (!this.homePersonHandle || !this._day) return ''
    return `/api/views/ancestor-of-the-day/${encodeURIComponent(
      this.homePersonHandle
    )}?date=${this._day}&locale=${this.appState.i18n.lang}`
  }

  renderLoading() {
    return html`<h3>${this._('Ancestor of the day')}</h3>
      <grampsjs-search-result-list
        .appState=${this.appState}
        loading
        numberLoading="1"
        large
      ></grampsjs-search-result-list>`
  }

  renderContent() {
    const person = this._data.data?.person
    return html`<h3>${this._('Ancestor of the day')}</h3>
      ${person
        ? html`<grampsjs-search-result-list
            .appState=${this.appState}
            .data=${[{object: person, object_type: 'person'}]}
            large
            linked
            noSep
          ></grampsjs-search-result-list>`
        : html`<p>${this._('No known direct ancestors yet.')}</p>`}`
  }
}

window.customElements.define(
  'grampsjs-ancestor-of-the-day',
  GrampsjsAncestorOfTheDay
)
