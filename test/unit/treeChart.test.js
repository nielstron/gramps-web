import {describe, expect, it} from 'vitest'
import {TreeChart} from '../../src/charts/TreeChart.js'

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
