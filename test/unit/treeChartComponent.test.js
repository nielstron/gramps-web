import {zoomIdentity} from 'd3-zoom'
import {describe, expect, it} from 'vitest'

import '../../src/components/GrampsjsTreeChart.js'

describe('tree chart component', () => {
  it('discards the previous viewport when the centered person changes', async () => {
    const chart = document.createElement('grampsjs-tree-chart')
    document.body.append(chart)
    await chart.updateComplete

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.__zoom = zoomIdentity.translate(180, -75).scale(1.4)
    chart.renderRoot.getElementById('container').append(svg)

    chart.willUpdate(new Map([['grampsId', 'I0001']]))

    expect(chart._savedZoom).toBeNull()
    chart.remove()
  })
})
