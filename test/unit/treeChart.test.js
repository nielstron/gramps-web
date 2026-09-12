import {describe, expect, it} from 'vitest'
import {TreeChart, viewBoxStart} from '../../src/charts/TreeChart.js'

const rootPerson = {
  id: 'person-root',
  name_given: 'Ada',
  name_surname: 'Lovelace',
  person: {
    gender: 0,
    gramps_id: 'I0042',
    handle: 'person-handle',
    profile: {},
  },
}

const chartSettings = {
  bboxWidth: 800,
  bboxHeight: 500,
  nAnc: 3,
  nDesc: 0,
  getImageUrl: () => '',
  canEdit: false,
  openProfileLabel: 'Person Details',
}

describe('TreeChart', () => {
  it('centers a small chart while keeping the selected person visible', () => {
    const ancestors = {
      ...rootPerson,
      children: [
        {
          ...rootPerson,
          id: 'person-parent',
          person: {...rootPerson.person, gramps_id: 'I0043'},
        },
      ],
    }
    const svg = TreeChart(null, ancestors, chartSettings)
    const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = svg
      .getAttribute('viewBox')
      .split(',')
      .map(Number)
    const rootChartX = 0
    const chartCenterX = 110
    const rootChartY = 0

    expect(viewBoxX + viewBoxWidth / 2).to.equal(chartCenterX)
    expect(rootChartX).toBeGreaterThan(viewBoxX)
    expect(rootChartX).toBeLessThan(viewBoxX + viewBoxWidth)
    expect(viewBoxY + viewBoxHeight / 2).to.equal(rootChartY)
  })

  it('opens a person profile from the magnifier without refocusing the tree', () => {
    const svg = TreeChart(null, rootPerson, chartSettings)
    let navigationEvent
    let selectionEvent
    svg.addEventListener('nav', event => {
      navigationEvent = event
    })
    window.addEventListener(
      'pedigree:person-selected',
      event => {
        selectionEvent = event
      },
      {once: true}
    )

    const button = svg.querySelector('.open-person-btn')
    expect(button).toBeTruthy()
    expect(button.getAttribute('aria-label')).toBe('Person Details')

    button.dispatchEvent(new MouseEvent('click', {bubbles: true}))

    expect(navigationEvent?.detail).toEqual({path: 'person/I0042'})
    expect(selectionEvent).toBeUndefined()
  })
})

describe('viewBoxStart', () => {
  it('centres a chart that fits the view', () => {
    expect(viewBoxStart(0, -100, 300, 1000)).toBe(-400)
  })

  it('centres the focus when the chart extends past both sides', () => {
    expect(viewBoxStart(0, -1000, 1000, 400)).toBe(-200)
  })

  it('does not scroll before the start of the chart', () => {
    expect(viewBoxStart(0, -115, 1000, 400)).toBe(-115)
  })

  it('does not scroll past the end of the chart', () => {
    expect(viewBoxStart(0, -800, 115, 400)).toBe(-285)
  })

  it('does not jump when a growing chart starts to overflow', () => {
    const fits = viewBoxStart(0, -115, 285, 400)
    const overflows = viewBoxStart(0, -115, 286, 400)
    expect(Math.abs(overflows - fits)).toBeLessThan(1)
  })
})
