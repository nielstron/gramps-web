import {zoomIdentity} from 'd3-zoom'
import {describe, expect, it} from 'vitest'

import '../../src/components/GrampsjsTreeChart.js'

describe('tree chart component', () => {
  it('keeps the zoom scale and resets the pan when the centered person changes', async () => {
    const chart = document.createElement('grampsjs-tree-chart')
    document.body.append(chart)
    await chart.updateComplete

    const people = ['I0001', 'I0002'].map(grampsId => ({
      handle: grampsId,
      gramps_id: grampsId,
      profile: {gramps_id: grampsId},
    }))
    chart.data = people
    chart.grampsId = 'I0001'
    await chart.updateComplete
    const svg = chart._chart.node
    svg.__zoom = zoomIdentity.translate(180, -75).scale(1.4)
    chart.grampsId = 'I0002'
    await chart.updateComplete
    expect(chart._chart.node).toBe(svg)
    expect(svg.__zoom).toEqual(zoomIdentity.scale(1.4))
    chart.remove()
  })
})
