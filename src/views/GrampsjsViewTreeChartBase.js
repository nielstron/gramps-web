import {css, html} from 'lit'
import '@material/web/textfield/filled-text-field.js'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
import '@material/web/slider/slider.js'
import '@material/web/button/text-button.js'
import '@material/web/fab/fab.js'
import '@material/web/iconbutton/icon-button.js'

import {
  mdiAccountDetails,
  mdiClose,
  mdiCog,
  mdiHomeAccount,
  mdiPencil,
} from '@mdi/js'
import '../components/GrampsjsIcon.js'
import {GrampsjsView} from './GrampsjsView.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import '../components/GrampsjsTooltip.js'

import {chartNameDisplayFormat, fireEvent} from '../util.js'
import {iconButtonColorStyles} from '../SharedStyles.js'

export class GrampsjsViewTreeChartBase extends GrampsjsStaleDataMixin(
  GrampsjsView
) {
  static get styles() {
    return [
      super.styles,
      iconButtonColorStyles,
      css`
        :host {
          margin: 0;
          margin-top: -4px;
          margin-bottom: -25px;
        }

        #controls {
          position: absolute;
          background-color: var(--md-sys-color-surface-container-low);
          border-radius: 16px;
          z-index: 1;
          padding: 0 10px;
        }

        #chart {
          height: calc(100vh - 165px);
          margin-bottom: -25px;
        }

        .chart-layout {
          display: flex;
          position: relative;
          margin-inline: -40px;
        }

        .chart-main {
          flex: 1;
          min-width: 0;
          position: relative;
        }

        #controls {
          left: 40px;
        }

        #menu-controls {
          box-sizing: border-box;
          flex: 0 0 310px;
          width: 310px;
          height: calc(100vh - 165px);
          overflow-y: auto;
          padding: 16px 20px;
          border-left: 1px solid var(--md-sys-color-outline-variant);
          background: var(--md-sys-color-surface-container-low);
          z-index: 2;
        }

        #menu-controls[hidden] {
          display: none;
        }

        .settings-heading,
        .slider-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .settings-heading h3 {
          margin: 0;
        }

        #menu-controls h4 {
          margin: 24px 0 8px;
        }

        .settings-help {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .setting {
          margin: 20px 0;
        }

        .slider-label {
          font-size: 15px;
        }

        .slider-label output {
          font-variant-numeric: tabular-nums;
          color: var(--md-sys-color-primary);
        }

        #menu-controls md-slider,
        #menu-controls md-filled-select,
        #menu-controls md-filled-text-field {
          width: 100%;
        }

        @media (max-width: 700px) {
          .chart-layout {
            margin-inline: -20px;
          }

          #controls {
            left: 20px;
          }

          #menu-controls {
            position: absolute;
            right: 0;
            top: 48px;
            width: min(310px, 90%);
            height: calc(100vh - 213px);
            box-shadow: -4px 4px 16px var(--grampsjs-body-font-color-10);
          }
        }

        #controls {
          --grampsjs-icon-button-color: var(--grampsjs-body-font-color-35);
          --grampsjs-icon-button-disabled-color: var(
            --grampsjs-body-font-color-10
          );
          --grampsjs-icon-button-disabled-opacity: 1;
        }

        #controls md-icon-button {
          --md-icon-button-icon-size: 26px;
        }

        md-fab {
          position: fixed;
          bottom: 32px;
          right: 32px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      disableHome: {type: Boolean},
      nAnc: {type: Number},
      nDesc: {type: Number},
      nMaxImages: {type: Number},
      nameDisplayFormat: {type: String},
      _data: {type: Array},
      _setAnc: {type: Boolean},
      _setDesc: {type: Boolean},
      _setMaxImages: {type: Boolean},
      _editMode: {type: Boolean},
      _settingsOpen: {type: Boolean},
    }
  }

  defaults = {
    nAnc: 1,
    nDesc: 1,
    nMaxImages: 50,
    nameDisplayFormat: chartNameDisplayFormat.surnameThenGiven,
    gapX: 30,
    gapY: 5,
  }

  constructor() {
    super()
    this.grampsId = ''
    this.disableHome = false
    this._data = []
    this._setAnc = false
    this._setDesc = false
    this._setSep = false
    this._setMaxImages = false
    this._editMode = false
    this._settingsOpen = false
    this._spacingSettingsKey = ''
    this._personQueryKey = ''
    this._fetchRequestId = 0
    this._boundToggleEditMode = this._toggleEditMode.bind(this)
    this._boundDisableEditMode = this._disableEditMode.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('edit-mode:toggle', this._boundToggleEditMode)
    window.addEventListener('edit-mode:off', this._boundDisableEditMode)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('edit-mode:toggle', this._boundToggleEditMode)
    window.removeEventListener('edit-mode:off', this._boundDisableEditMode)
  }

  get nAnc() {
    return this.defaults.nAnc
  }

  get nDesc() {
    return this.defaults.nDesc
  }

  get nMaxImages() {
    return this.defaults.nMaxImages
  }

  get nameDisplayFormat() {
    return this.defaults.nameDisplayFormat
  }

  renderContent() {
    return html`<div class="chart-layout">
        <div class="chart-main">
          <div id="controls">${this.renderControls()}</div>
          <div id="chart">${this.renderChart()}</div>
        </div>
        ${this._renderSettingsPanel()}
      </div>
      ${this.appState.permissions.canEdit && !this._editMode
        ? this.renderFab()
        : ''}`
  }

  renderFab() {
    return html`
      <md-fab variant="secondary" @click="${this._enableEditMode}">
        <grampsjs-icon
          slot="icon"
          .path="${mdiPencil}"
          color="var(--mdc-theme-on-secondary)"
        ></grampsjs-icon>
      </md-fab>
    `
  }

  _enableEditMode() {
    this._editMode = true
    fireEvent(this, 'edit-mode:on', {
      title: this._('Edit'),
      hideDeleteButton: true,
    })
  }

  _disableEditMode() {
    this._editMode = false
  }

  _handleAddPersonRelation(e) {
    const personData = this._data.find(p => p.handle === e.detail.handle)
    if (!personData) {
      return
    }
    const addPersonEl = this.renderRoot.querySelector(
      'grampsjs-tree-chart-add-person'
    )
    if (addPersonEl) {
      addPersonEl.open(personData)
    }
  }

  _toggleEditMode() {
    if (!this.active || !this.appState.permissions.canEdit) {
      return
    }
    if (this._editMode) {
      this._disableEditMode()
      fireEvent(this, 'edit-mode:off', {})
    } else {
      this._enableEditMode()
    }
  }

  renderControls() {
    return html`
      <md-icon-button
        @click=${this._backToHomePerson}
        ?disabled=${this.disableHome}
        aria-label="${this._('Home Person')}"
        id="button-home"
        ><grampsjs-icon
          path="${mdiHomeAccount}"
          color="currentColor"
        ></grampsjs-icon
      ></md-icon-button>
      <grampsjs-tooltip for="button-home" .appState=${this.appState}
        >${this._('Home Person')}</grampsjs-tooltip
      >
      <md-icon-button
        @click=${this._goToPerson}
        aria-label="${this._('Person Details')}"
        id="btn-person"
        ><grampsjs-icon
          path="${mdiAccountDetails}"
          color="currentColor"
        ></grampsjs-icon
      ></md-icon-button>
      <grampsjs-tooltip for="btn-person" .appState=${this.appState}
        >${this._('Person Details')}</grampsjs-tooltip
      >
      <md-icon-button
        id="btn-controls"
        aria-label="${this._('Preferences')}"
        aria-expanded="${this._settingsOpen}"
        aria-controls="menu-controls"
        @click=${this._openMenuControls}
        ><grampsjs-icon path="${mdiCog}" color="currentColor"></grampsjs-icon
      ></md-icon-button>
      <grampsjs-tooltip for="btn-controls" .appState=${this.appState}
        >${this._('Preferences')}</grampsjs-tooltip
      >
    `
  }

  _renderSettingsPanel() {
    return html`
      <aside
        id="menu-controls"
        aria-label="${this._('Preferences')}"
        ?hidden=${!this._settingsOpen}
        @keydown=${event => {
          if (event.key === 'Escape') this._closeMenuControls()
        }}
      >
        <div class="settings-heading">
          <h3>${this._('Preferences')}</h3>
          <md-icon-button
            id="close-settings"
            aria-label="${this._('Close')}"
            @click=${this._closeMenuControls}
          >
            <grampsjs-icon
              path=${mdiClose}
              color="currentColor"
            ></grampsjs-icon>
          </md-icon-button>
        </div>
        ${this.renderLayoutControls()}
        ${this._spacingSettingsKey
          ? html`
              <h4>${this._('Spacing')}</h4>
              ${this._renderSlider(
                'gapX',
                this._('Generation spacing'),
                this.treeSpacing.gapX,
                300,
                event => this._handleSpacingInput(event, 'gapX'),
                'px'
              )}
              ${this._renderSlider(
                'gapY',
                this._('Branch spacing'),
                this.treeSpacing.gapY,
                120,
                event => this._handleSpacingInput(event, 'gapY'),
                'px'
              )}
            `
          : ''}
        ${this._setAnc
          ? this._renderNumberSetting(
              this._('Max Ancestor Generations'),
              this.nAnc,
              1,
              this._handleChangeAnc
            )
          : ''}
        ${this._setDesc
          ? this._renderNumberSetting(
              this._('Max Descendant Generations'),
              this.nDesc,
              0,
              this._handleChangeDesc
            )
          : ''}
        ${this._setSep
          ? this._renderNumberSetting(
              this._('Max Degree of Separation'),
              this.nAnc,
              0,
              this._handleChangeAnc
            )
          : ''}
        ${this._setMaxImages
          ? this._renderNumberSetting(
              this._('Max Number of Images displayed'),
              this.nMaxImages,
              0,
              this._handleChangeMaxImages
            )
          : ''}
        <div class="setting">
          <md-filled-select
            id="name-display-format"
            label=${this._('Name Display Format')}
            @change=${this._handleChangeNameDisplayFormat}
          >
            ${Object.values(chartNameDisplayFormat).map(
              format => html`
                <md-select-option
                  value=${format}
                  ?selected=${format === this.nameDisplayFormat}
                >
                  <div slot="headline">${this._(format)}</div>
                </md-select-option>
              `
            )}
          </md-filled-select>
        </div>
        <md-text-button @click=${this._resetSettings}
          >${this._('Reset')}</md-text-button
        >
      </aside>
    `
  }

  _renderNumberSetting(label, value, min, onChange) {
    return html`<div class="setting">
      <md-filled-text-field
        label=${label}
        .value=${String(value)}
        type="number"
        min=${min}
        @change=${event => {
          if (event.target.reportValidity()) onChange.call(this, event)
        }}
      ></md-filled-text-field>
    </div>`
  }

  _renderSlider(id, label, value, max, onInput, unit = '') {
    return html`<div class="setting">
      <div class="slider-label">
        <span id="${id}-label">${label}</span
        ><output for=${id}>${value}${unit}</output>
      </div>
      <md-slider
        id=${id}
        aria-label=${label}
        min="0"
        max=${max}
        step="1"
        .value=${value}
        @input=${onInput}
      ></md-slider>
    </div>`
  }

  // eslint-disable-next-line class-methods-use-this
  renderLayoutControls() {
    return ''
  }

  get treeSpacing() {
    return {
      gapX: this.defaults.gapX,
      gapY: this.defaults.gapY,
      ...this.appState?.settings?.[this._spacingSettingsKey],
    }
  }

  _handleSpacingInput(event, key) {
    this.appState.updateSettings(
      {
        [this._spacingSettingsKey]: {
          ...this.treeSpacing,
          [key]: Number(event.target.value),
        },
      },
      false
    )
  }

  _resetSettings() {
    this._resetLevels()
    if (this._spacingSettingsKey) {
      this.appState.updateSettings(
        {
          [this._spacingSettingsKey]: {
            gapX: this.defaults.gapX,
            gapY: this.defaults.gapY,
          },
        },
        false
      )
    }
  }

  // eslint-disable-next-line class-methods-use-this
  renderChart() {
    return ''
  }

  _backToHomePerson() {
    fireEvent(this, 'tree:home')
  }

  update(changed) {
    super.update(changed)
    if (
      changed.has('grampsId') ||
      changed.has('settings') ||
      changed.has('appState')
    ) {
      const queryKey = JSON.stringify([
        this.grampsId,
        this.appState?.i18n?.lang,
        this._getPersonRules(this.grampsId),
      ])
      if (queryKey !== this._personQueryKey) {
        this._personQueryKey = queryKey
        this._fetchData(this.grampsId)
      }
    }
  }

  handleUpdateStaleData() {
    this._fetchData(this.grampsId)
  }

  // eslint-disable-next-line class-methods-use-this
  _resetLevels() {}

  _getPersonRules(grampsId) {
    return {
      function: 'or',
      rules: [
        {
          name: 'IsLessThanNthGenerationAncestorOf',
          values: [grampsId, this.nAnc + 1],
        },
        {
          name: 'IsLessThanNthGenerationDescendantOf',
          values: [grampsId, this.nDesc + 1],
        },
      ],
    }
  }

  async _fetchData(grampsId) {
    const requestId = ++this._fetchRequestId
    this.loading = true
    const rules = this._getPersonRules(grampsId)
    const data = await this.appState.apiGet(
      `/api/people/?rules=${encodeURIComponent(JSON.stringify(rules))}&locale=${
        this.appState.i18n.lang || 'en'
      }&profile=self&extend=event_ref_list,primary_parent_family,family_list`
    )
    if (requestId !== this._fetchRequestId) {
      return
    }
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._data = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  _goToPerson() {
    fireEvent(this, 'tree:person')
  }

  _handleChangeAnc(e) {
    this.nAnc = parseInt(e.target.value, 10)
  }

  _handleChangeDesc(e) {
    this.nDesc = parseInt(e.target.value, 10)
  }

  _handleChangeMaxImages(e) {
    this.nMaxImages = parseInt(e.target.value, 10)
  }

  _handleChangeNameDisplayFormat(e) {
    this.nameDisplayFormat = e.target.value
  }

  _openMenuControls() {
    this._settingsOpen = !this._settingsOpen
  }

  _closeMenuControls() {
    this._settingsOpen = false
    this.shadowRoot.getElementById('btn-controls').focus()
  }
}
