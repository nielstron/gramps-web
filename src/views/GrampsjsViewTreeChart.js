import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsTreeChart.js'
import '../components/GrampsjsTreeChartAddPerson.js'

export class GrampsjsViewTreeChart extends GrampsjsViewTreeChartBase {
  constructor() {
    super()
    this._setAnc = true
    this.defaults.nAnc = 3
    this._spacingSettingsKey = 'ancestorChartSpacing'
  }

  get nAnc() {
    return this.appState?.settings?.treeChartAnc ?? this.defaults.nAnc
  }

  set nAnc(value) {
    this.appState.updateSettings({treeChartAnc: value}, false)
  }

  get nameDisplayFormat() {
    return (
      this.appState?.settings?.treeChartNameDisplayFormat ??
      this.defaults.nameDisplayFormat
    )
  }

  set nameDisplayFormat(value) {
    this.appState.updateSettings({treeChartNameDisplayFormat: value}, false)
  }

  _resetLevels() {
    this.nAnc = this.defaults.nAnc
    this.nameDisplayFormat = this.defaults.nameDisplayFormat
  }

  renderChart() {
    return html`
      <div @add-new-person-relation="${this._handleAddPersonRelation}">
        <grampsjs-tree-chart
          ancestors
          grampsId=${this.grampsId}
          nAnc=${this.nAnc + 1}
          nDesc=${this.nDesc + 1}
          nameDisplayFormat=${this.nameDisplayFormat}
          ?canEdit="${this._editMode}"
          .data=${this._data}
          .gapX=${this.treeSpacing.gapX}
          .gapY=${this.treeSpacing.gapY}
          .appState="${this.appState}"
        >
        </grampsjs-tree-chart>
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

window.customElements.define('grampsjs-view-tree-chart', GrampsjsViewTreeChart)
