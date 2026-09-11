import {html, css} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsRelationshipChart.js'
import '../components/GrampsjsTreeChartAddPerson.js'
import {DEFAULT_RELATIONSHIP_LAYOUT} from '../charts/relationshipLayout.js'

export class GrampsjsViewRelationshipChart extends GrampsjsViewTreeChartBase {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
        }
      `,
    ]
  }

  constructor() {
    super()
    this._setSep = true
    this._setMaxImages = true
    this.color = ''
    this.defaults.nAnc = 3
  }

  get nAnc() {
    return this.appState?.settings?.relationshipChartAnc ?? this.defaults.nAnc
  }

  set nAnc(value) {
    this.appState.updateSettings({relationshipChartAnc: value}, false)
  }

  get nMaxImages() {
    return (
      this.appState?.settings?.relationshipChartMaxImages ??
      this.defaults.nMaxImages
    )
  }

  set nMaxImages(value) {
    this.appState.updateSettings({relationshipChartMaxImages: value}, false)
  }

  get nameDisplayFormat() {
    return (
      this.appState?.settings?.relationshipChartNameDisplayFormat ??
      this.defaults.nameDisplayFormat
    )
  }

  set nameDisplayFormat(value) {
    this.appState.updateSettings(
      {relationshipChartNameDisplayFormat: value},
      false
    )
  }

  _resetLevels() {
    this.appState.updateSettings(
      {
        relationshipChartAnc: this.defaults.nAnc,
        relationshipChartMaxImages: this.defaults.nMaxImages,
        relationshipChartNameDisplayFormat: this.defaults.nameDisplayFormat,
        relationshipChartLayout: {...DEFAULT_RELATIONSHIP_LAYOUT},
      },
      false
    )
  }

  get layout() {
    return {
      ...DEFAULT_RELATIONSHIP_LAYOUT,
      ...this.appState?.settings?.relationshipChartLayout,
    }
  }

  _handleLayoutInput(event, key) {
    this.appState.updateSettings(
      {
        relationshipChartLayout: {
          ...this.layout,
          [key]: Number(event.target.value),
        },
      },
      false
    )
  }

  renderLayoutControls() {
    return html`
      <h4>${this._('Grouping priorities')}</h4>
      <p class="settings-help">
        ${this._(
          'Higher priorities keep those relatives closer together. Changes appear as you move the sliders.'
        )}
      </p>
      ${[
        ['partners', this._('Partners')],
        ['children', this._('Parents and children')],
        ['siblings', this._('Siblings')],
      ].map(([key, label]) =>
        this._renderSlider(key, label, this.layout[key], 100, event =>
          this._handleLayoutInput(event, key)
        )
      )}
    `
  }

  _getPersonRules(grampsId) {
    return {
      function: 'or',
      rules: [
        {
          name: 'DegreesOfSeparation',
          values: [grampsId, this.nAnc],
        },
      ],
    }
  }

  renderChart() {
    return html`
      <div @add-new-person-relation="${this._handleAddPersonRelation}">
        <grampsjs-relationship-chart
          .appState=${this.appState}
          grampsId=${this.grampsId}
          nAnc=${this.nAnc + 1}
          nMaxImages=${this.nMaxImages}
          nameDisplayFormat=${this.nameDisplayFormat}
          ?canEdit="${this._editMode}"
          .data=${this._data}
          .layout=${this.layout}
        >
        </grampsjs-relationship-chart>
      </div>
    `
  }

  renderContent() {
    return html`
      ${super.renderContent()}
      <grampsjs-tree-chart-add-person
        .appState="${this.appState}"
      ></grampsjs-tree-chart-add-person>
    `
  }
}

window.customElements.define(
  'grampsjs-view-relationship-chart',
  GrampsjsViewRelationshipChart
)
