/*
A natural language time delta component.
*/

import {html, LitElement} from 'lit'
import dayjs from 'dayjs/esm'
import {toDayjsLocale} from '../locale.js'
import relativeTime from 'dayjs/esm/plugin/relativeTime'
import LocalizedFormat from 'dayjs/esm/plugin/localizedFormat'

import './GrampsjsTooltip.js'

dayjs.extend(relativeTime)
dayjs.extend(LocalizedFormat)

class GrampsjsTimedelta extends LitElement {
  static get properties() {
    return {
      timestamp: {type: Number},
      locale: {type: String},
      timestampString: {type: String},
      tooltipString: {type: String},
    }
  }

  constructor() {
    super()
    this.timestamp = 0
    this.locale = 'en_GB'
    this.timestampString = ''
    this.tooltipString = ''
  }

  render() {
    return html`<span id="timestamp">${this.timestampString}</span
      ><grampsjs-tooltip
        for="timestamp"
        content="${this.tooltipString}"
      ></grampsjs-tooltip>`
  }

  _updateString() {
    const date = dayjs
      .unix(this.timestamp)
      .locale(toDayjsLocale(this.locale, dayjs.Ls))
    this.timestampString = date.fromNow()
    this.tooltipString = date.format('lll')
  }

  connectedCallback() {
    super.connectedCallback()
    this._updateString()
    this._timerInterval = setInterval(() => this._updateString(), 10000)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    clearInterval(this._timerInterval)
  }
}

window.customElements.define('grampsjs-timedelta', GrampsjsTimedelta)
