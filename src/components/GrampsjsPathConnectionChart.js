import {css, html} from 'lit'

import {GrampsjsChartBase} from './GrampsjsChartBase.js'
import {ConnectionPathChart} from '../charts/RelationshipChart.js'
import {getImageUrl} from '../charts/util.js'

export class GrampsjsPathConnectionChart extends GrampsjsChartBase {
  static get styles() {
    return [
      super.styles,
      css`
        svg .personBox {
          fill: var(--grampsjs-color-shade-230);
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      steps: {type: Array},
      nameDisplayFormat: {type: String},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.steps = []
    this.nameDisplayFormat = 'Surname, Given'
  }

  renderChart() {
    if (!this.data.length || !this.grampsId) return ''
    return html`${ConnectionPathChart(this.data, this.steps, {
      grampsId: this.grampsId,
      getImageUrl: person => getImageUrl(person?.data || {}, 100),
      bboxWidth: this.containerWidth,
      bboxHeight: this.containerHeight,
      nameDisplayFormat: this.nameDisplayFormat,
      bornLabel: this._('born'),
      locale: this.appState?.i18n?.lang,
      openProfileLabel: this._('Person Details'),
      relationLabels: {
        parent: this._('Parent'),
        child: this._('Child'),
        partner: this._('Partner'),
        sibling: this._('Sibling'),
      },
    })}`
  }
}

window.customElements.define(
  'grampsjs-path-connection-chart',
  GrampsjsPathConnectionChart
)
