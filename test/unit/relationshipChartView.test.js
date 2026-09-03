import {describe, expect, it, vi} from 'vitest'
import {GrampsjsViewRelationshipChart} from '../../src/views/GrampsjsViewRelationshipChart.js'

describe('relationship chart view', () => {
  it('passes localization state to the rendered chart', () => {
    const view = new GrampsjsViewRelationshipChart()
    view.appState = {
      i18n: {lang: 'de', strings: {born: 'geb.'}},
      settings: {},
      updateSettings: vi.fn(),
    }
    view.grampsId = 'I1'

    expect(view.renderChart().values).toContain(view.appState)
  })

  it('shows three degrees of separation by default', () => {
    const view = new GrampsjsViewRelationshipChart()
    view.appState = {
      settings: {},
      updateSettings: vi.fn(),
    }

    expect(view.nAnc).toBe(3)
    expect(view._getPersonRules('I1')).toEqual({
      function: 'or',
      rules: [{name: 'DegreesOfSeparation', values: ['I1', 3]}],
    })
  })

  it('keeps a saved degree preference', () => {
    const view = new GrampsjsViewRelationshipChart()
    view.appState = {
      settings: {relationshipChartAnc: 5},
      updateSettings: vi.fn(),
    }

    expect(view.nAnc).toBe(5)
  })

  it('ignores a slower response for a previously selected person', async () => {
    const responses = []
    const view = new GrampsjsViewRelationshipChart()
    view.appState = {
      apiGet: vi.fn(
        () =>
          new Promise(resolve => {
            responses.push(resolve)
          })
      ),
      i18n: {lang: 'en'},
      settings: {},
      updateSettings: vi.fn(),
    }

    view.grampsId = 'I1'
    const firstRequest = view._fetchData('I1')
    view.grampsId = 'I2'
    const secondRequest = view._fetchData('I2')

    responses[1]({data: ['current']})
    await secondRequest
    responses[0]({data: ['stale']})
    await firstRequest

    expect(view._data).toEqual(['current'])
  })
})
