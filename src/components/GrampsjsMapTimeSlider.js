import {html, css, LitElement} from 'lit'
import '@material/web/slider/slider.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/icon/icon.js'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'
import '@material/web/switch/switch'

import {mdiCog} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import {renderIconSvg} from '../icons.js'
import './GrampsjsTooltip.js'

class GrampsjsMapTimeSlider extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #container {
          background-color: var(--md-sys-color-surface-container);
          border-radius: 14px;
          width: 100%;
          position: absolute;
          bottom: 8px;
          height: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        md-slider {
          width: 100%;
          --md-slider-active-track-color: var(--md-sys-color-primary);
          --md-slider-inactive-track-color: var(--md-sys-color-outline-variant);
          --md-slider-inactive-track-height: 4px;
          --md-slider-active-track-height: 4px;
        }

        div.date {
          display: inline-block;
          font-size: 13px;
          font-weight: 500;
          color: var(--grampsjs-body-font-color-60);
          white-space: nowrap;
          margin-left: 4px;
          margin-right: 8px;
          line-height: 24px;
          height: 24px;
          min-width: 75px;
          text-align: right;
        }

        .date .year {
          font-weight: 600;
        }

        .control {
          --md-icon-button-icon-size: 18px;
          --md-icon-button-state-layer-height: 22px;
          --md-icon-button-state-layer-width: 22px;
          height: 22px;
          width: 22px;
          display: inline-block;
        }

        md-menu {
          --md-menu-item-one-line-container-height: 48px;
        }

        md-switch {
          transform: scale(0.5);
        }
      `,
    ]
  }

  static get properties() {
    return {
      value: {type: Number},
      span: {type: Number},
      min: {type: Number},
      max: {type: Number},
    }
  }

  constructor() {
    super()
    this.min = 1500
    this.value = new Date().getFullYear() - 50
    this.span = 50
    this.max = new Date().getFullYear()
    this._rangeStart = this.value - Math.abs(this.span)
    this._rangeEnd = this.value + Math.abs(this.span)
  }

  updated(changedProperties) {
    if (changedProperties.has('value') || changedProperties.has('span')) {
      const absSpan = Math.abs(this.span || 0)
      const nextStart = this.value - absSpan
      const nextEnd = this.value + absSpan
      this._rangeStart = this._clampValue(nextStart)
      this._rangeEnd = this._clampValue(nextEnd)
    }
    if (changedProperties.has('min') || changedProperties.has('max')) {
      this._rangeStart = this._clampValue(this._rangeStart)
      this._rangeEnd = this._clampValue(this._rangeEnd)
    }
  }

  _clampValue(value) {
    if (!Number.isFinite(value)) return this.min
    if (value < this.min) return this.min
    if (value > this.max) return this.max
    return Math.round(value)
  }

  get _yearStart() {
    return this._clampValue(this._rangeStart)
  }

  get _yearEnd() {
    return this._clampValue(this._rangeEnd)
  }

  render() {
    const yearStart = this._yearStart
    const yearEnd = this._yearEnd
    return html`
      <div id="container">
        <md-slider
          id="time-slider"
          ?range="${true}"
          @input="${this._handleInput}"
          labeled
          min="${this.min}"
          max="${this.max}"
          step="1"
          .valueStart="${yearStart}"
          .valueEnd="${yearEnd}"
        ></md-slider>
        <div class="date">
          <span class="year">${yearStart}</span>
          &ndash;
          <span class="year">${yearEnd}</span>
        </div>
        <div class="control">
          <md-icon-button
            id="span-button"
            @click="${this._handleSpanClick}"
            ?disabled="${this.span < 0}"
          >
            <grampsjs-tooltip for="span-button" .appState="${this.appState}"
              >${this._('Span')}</grampsjs-tooltip
            >
            <md-icon
              >${renderIconSvg(mdiCog, 'var(--md-sys-color-primary)')}</md-icon
            >
          </md-icon-button>
        </div>
        <md-switch
          id="filter-switch"
          @input="${this._handleSwitch}"
          ?selected="${this.span > 0}"
        ></md-switch>
        <grampsjs-tooltip for="filter-switch" .appState="${this.appState}"
          >${this._('Toggle time filter for places')}</grampsjs-tooltip
        >
      </div>
      <md-menu
        positioning="fixed"
        id="span-menu"
        anchor="span-button"
        skip-restore-focus
      >
        ${[1, 10, 25, 50, 100].map(
          years => html`
            <md-menu-item @click="${() => this._handleSpanYearsClick(years)}">
              <div slot="headline">&pm;&nbsp;${years}</div>
            </md-menu-item>
          `
        )}
      </md-menu>
    `
  }

  _fireEvent() {
    const yearStart = this._yearStart
    const yearEnd = this._yearEnd
    const spanAbs = Math.max(0, (yearEnd - yearStart) / 2)
    const value = yearStart + spanAbs
    const detail = {
      value,
      span: this.span >= 0 ? spanAbs : -spanAbs,
      yearStart,
      yearEnd,
    }
    fireEvent(this, 'timeslider:change', detail)
  }

  connectedCallback() {
    super.connectedCallback()
    this._fireEvent()
  }

  _handleSwitch() {
    const el = this.renderRoot.querySelector('md-switch')
    if (!el) return
    const absSpan = Math.abs(this.span) || 50
    this.span = el.selected ? absSpan : -absSpan
    this._fireEvent()
  }

  _handleSpanYearsClick(years) {
    const value = this.value
    this.value = value
    this.span = this.span > 0 ? years : -years
    this._rangeStart = value - years
    this._rangeEnd = value + years
    this._rangeStart = this._clampValue(this._rangeStart)
    this._rangeEnd = this._clampValue(this._rangeEnd)
    this._fireEvent()
  }

  _handleSpanClick() {
    const menu = this.renderRoot.querySelector('#span-menu')
    menu.open = true
  }

  _handleInput() {
    const slider = this.renderRoot.querySelector('md-slider')
    if (!slider) return
    const start =
      slider.valueStart != null
        ? Number(slider.valueStart)
        : Number(Array.isArray(slider.value) ? slider.value[0] : slider.value)
    const end =
      slider.valueEnd != null
        ? Number(slider.valueEnd)
        : Number(Array.isArray(slider.value) ? slider.value[1] : slider.value)
    if (!Number.isFinite(start) || !Number.isFinite(end)) return
    this._rangeStart = this._clampValue(Math.min(start, end))
    this._rangeEnd = this._clampValue(Math.max(start, end))
    const span = (this._yearEnd - this._yearStart) / 2
    this.value = this._yearStart + span
    this.span = this.span >= 0 ? span : -span
    this._fireEvent()
  }

  reset() {
    if (this.span > 0) {
      this.span = -this.span
      this._fireEvent()
    }
  }
}

window.customElements.define('grampsjs-map-time-slider', GrampsjsMapTimeSlider)
