import {css, html} from 'lit'

import {GrampsjsChartBase} from './GrampsjsChartBase.js'
import {RelationshipChart} from '../charts/RelationshipChart.js'
import {layoutRelationships} from '../charts/layout/relationshipLayout.js'
import {chartTransitionDuration, getImageUrl} from '../charts/util.js'
import {fireEvent} from '../util.js'

const connectionColor = relation =>
  ({
    parent: '#1976d2',
    child: '#1976d2',
    partner: '#c2185b',
    sibling: '#00897b',
  }[relation] || '#7b1fa2')

class ConnectionPathChart extends RelationshipChart {
  styleLinks(links, palette) {
    super.styleLinks(links, palette)
    links
      .filter(link => link.kind === 'connection')
      .attr('stroke', link => connectionColor(link.relation))
      .attr('stroke-width', 4)
      .attr('stroke-linecap', 'round')
      .each(function (link) {
        const title =
          this.querySelector('title') ??
          this.appendChild(
            document.createElementNS('http://www.w3.org/2000/svg', 'title')
          )
        title.textContent = link.label || link.relationshipType || link.relation
      })
  }
}

function connectionLayout(layout, steps, labels) {
  const nodesByHandle = new Map()
  for (const node of layout.nodes) {
    if (node.kind === 'person' && !nodesByHandle.has(node.handle)) {
      nodesByHandle.set(node.handle, node)
    }
  }
  const connections = steps.flatMap((step, index) => {
    const source = nodesByHandle.get(step.from_handle)
    const target = nodesByHandle.get(step.to_handle)
    if (!source || !target) return []
    return [
      {
        key: `connection:${index}:${source.key}->${target.key}`,
        kind: 'connection',
        relation: step.relation,
        relationshipType: step.relationship_type,
        label: labels[step.relation],
        source,
        target,
        points: [
          [source.x, source.y],
          [target.x, target.y],
        ],
      },
    ]
  })
  return {...layout, links: [...layout.links, ...connections]}
}

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
      contextFamilies: {type: Array},
      nameDisplayFormat: {type: String},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.steps = []
    this.contextFamilies = []
    this.nameDisplayFormat = 'Surname, Given'
    this._chart = new ConnectionPathChart()
    this._layout = null
    this._layoutRequest = 0
  }

  render() {
    return html`<div id="container"></div>`
  }

  firstUpdated() {
    super.firstUpdated()
    this.renderRoot.getElementById('container').append(this._chart.node)
  }

  willUpdate(changed) {
    super.willUpdate(changed)
    if (
      changed.has('data') ||
      changed.has('grampsId') ||
      changed.has('steps')
    ) {
      const root = this._graph.personByGrampsId(this.grampsId)
      if (root) this._requestLayout(root.handle)
      else if (changed.has('data')) {
        this._layoutRequest += 1
        this._layout = null
      }
    }
  }

  updated() {
    if (!this._layout) {
      this._chart.clear()
      return
    }
    this._chart.update(this._layout, {
      getImageUrl: node => getImageUrl(node.person, 100),
      nameDisplayFormat: this.nameDisplayFormat,
      locale: this.appState?.i18n?.lang,
      openProfileLabel: this._('Person Details'),
      duration: chartTransitionDuration(),
      bboxWidth: this.containerWidth,
      bboxHeight: this.containerHeight,
      fit: true,
    })
  }

  async _requestLayout(rootHandle) {
    const request = ++this._layoutRequest
    let layout = null
    try {
      const baseLayout = await layoutRelationships(this._graph, rootHandle)
      layout = connectionLayout(baseLayout, this.steps, {
        parent: this._('Parent'),
        child: this._('Child'),
        partner: this._('Partner'),
        sibling: this._('Sibling'),
      })
    } catch (error) {
      if (request === this._layoutRequest) {
        fireEvent(this, 'grampsjs:error', {message: error.message})
      }
    }
    if (request === this._layoutRequest) {
      this._layout = layout
      this.requestUpdate()
    }
  }
}

window.customElements.define(
  'grampsjs-path-connection-chart',
  GrampsjsPathConnectionChart
)
