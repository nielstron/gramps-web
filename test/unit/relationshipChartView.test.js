import {describe, expect, it, vi} from 'vitest'
import {GrampsjsViewRelationshipChart} from '../../src/views/GrampsjsViewRelationshipChart.js'
import {GrampsjsViewTreeChart} from '../../src/views/GrampsjsViewTreeChart.js'
import {GrampsjsViewDescendantChart} from '../../src/views/GrampsjsViewDescendantChart.js'
import {GrampsjsViewHourglassChart} from '../../src/views/GrampsjsViewHourglassChart.js'
import {DEFAULT_RELATIONSHIP_LAYOUT} from '../../src/charts/relationshipLayout.js'

describe('relationship chart view', () => {
  it('uses the tuned grouping priorities by default', () => {
    const view = new GrampsjsViewRelationshipChart()
    view.appState = {
      settings: {},
      updateSettings: vi.fn(),
    }

    expect(view.layout).toEqual({partners: 100, children: 28, siblings: 52})
  })

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

  it('previews and saves grouping priorities while retaining the other weights', () => {
    const view = new GrampsjsViewRelationshipChart()
    view.appState = {
      settings: {
        relationshipChartLayout: {partners: 10, children: 20, siblings: 30},
      },
      updateSettings: vi.fn(),
    }
    view._handleLayoutInput({target: {value: '70'}}, 'siblings')
    expect(view.appState.updateSettings).toHaveBeenCalledWith(
      {
        relationshipChartLayout: {partners: 10, children: 20, siblings: 70},
      },
      false
    )
    view._resetLevels()
    expect(view.appState.updateSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({
        relationshipChartLayout: DEFAULT_RELATIONSHIP_LAYOUT,
      }),
      false
    )
  })

  it.each([
    [GrampsjsViewTreeChart, 'ancestorChartSpacing', 30],
    [GrampsjsViewDescendantChart, 'descendantChartSpacing', 60],
    [GrampsjsViewHourglassChart, 'hourglassChartSpacing', 60],
  ])('keeps spacing preferences separate for %s', (View, key, defaultGap) => {
    const view = new View()
    view.appState = {
      settings: {[key]: {gapX: 140, gapY: 15}},
      updateSettings: vi.fn(),
    }
    expect(view.treeSpacing).toEqual({gapX: 140, gapY: 15})
    view._handleSpacingInput({target: {value: '60'}}, 'gapY')
    expect(view.appState.updateSettings).toHaveBeenCalledWith(
      {[key]: {gapX: 140, gapY: 60}},
      false
    )
    view._resetSettings()
    expect(view.appState.updateSettings).toHaveBeenLastCalledWith(
      {[key]: {gapX: defaultGap, gapY: 5}},
      false
    )
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
