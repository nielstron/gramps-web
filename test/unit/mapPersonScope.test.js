import {describe, expect, it, vi} from 'vitest'

import {GrampsjsViewMap} from '../../src/views/GrampsjsViewMap.js'

describe('map person scope', () => {
  it('centers the year on birth only when requested by person search', async () => {
    const person = {
      handle: 'person',
      birth_ref_index: 0,
      event_ref_list: [{ref: 'birth'}],
      extended: {
        events: [
          {
            handle: 'birth',
            date: {calendar: 0, modifier: 0, dateval: [1, 1, 1780, false]},
          },
        ],
      },
    }
    const view = new GrampsjsViewMap()
    view.appState = {
      apiGet: vi.fn().mockResolvedValue({data: person}),
      i18n: {lang: 'en'},
    }
    view._selectedPerson = person
    view._refreshPersonEventGroups = vi.fn()
    view._applyPlaceFilter = vi.fn()
    view._writeMapUrl = vi.fn()
    view._year = 1926
    view._yearSpan = 1000
    await view._highlightPersonPlaces(person)
    expect(view._year).toBe(1926)
    await view._highlightPersonPlaces(person, {focusBirth: true})
    expect(view._year).toBe(1780)
    expect(view._yearStart).toBe(780)
    expect(view._yearEnd).toBe(2780)
    expect(view._yearSpan).toBe(1000)
    person.birth_ref_index = -1
    person.event_ref_list = [{ref: 'later'}, {ref: 'unknown'}, {ref: 'early'}]
    person.extended.events = [
      {
        handle: 'later',
        date: {calendar: 0, modifier: 0, dateval: [1, 1, 1850, false]},
      },
      {handle: 'unknown'},
      {
        handle: 'early',
        date: {calendar: 0, modifier: 0, dateval: [1, 1, 1820, false]},
      },
    ]
    await view._highlightPersonPlaces(person, {focusBirth: true})
    expect(view._year).toBe(1820)
    person.extended.events = []
    await view._highlightPersonPlaces(person, {focusBirth: true})
    expect(view._year).toBe(1820)
  })
  it('loads ancestor events without joining different people into one route', async () => {
    const apiGet = vi.fn().mockResolvedValue({
      data: [
        {handle: 'ancestor-1', event_ref_list: [{ref: 'e1'}, {ref: 'e2'}]},
        {handle: 'ancestor-2', event_ref_list: [{ref: 'e3'}]},
      ],
    })
    const view = new GrampsjsViewMap()
    view.appState = {apiGet, i18n: {lang: 'en', strings: {}}}
    view._selectedPerson = {gramps_id: 'I1', handle: 'root'}
    view._dataEvents = [
      {handle: 'e1', date: {sortval: 1}, place: 'p1'},
      {handle: 'e2', date: {sortval: 2}, place: 'p2'},
      {handle: 'e3', date: {sortval: 3}, place: 'p3'},
    ]
    view._fitPersonPlaces = vi.fn()

    await view._handlePersonScopeChange({detail: {value: 'ancestors'}})

    expect(apiGet).toHaveBeenCalledOnce()
    expect(decodeURIComponent(apiGet.mock.calls[0][0])).toContain(
      'IsLessThanNthGenerationAncestorOf'
    )
    expect(view._personPlaceHandles).toEqual(['p1', 'p2', 'p3'])
    expect(
      view._personEventGroups.map(events => events.map(e => e.handle))
    ).toEqual([['e1', 'e2'], ['e3']])
  })
})
