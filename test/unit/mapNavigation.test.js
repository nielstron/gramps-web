import {describe, it, expect, vi} from 'vitest'
import {GrampsjsEvent} from '../../src/components/GrampsjsEvent.js'
import {GrampsjsViewMap} from '../../src/views/GrampsjsViewMap.js'

describe('show in map time selection', () => {
  it('restores a person link at birth unless a year is explicitly saved', async () => {
    const view = new GrampsjsViewMap()
    view.appState = {
      i18n: {lang: 'en'},
      apiGet: vi.fn().mockResolvedValue({data: [{handle: 'p'}]}),
    }
    view._handlePersonSelected = vi.fn()
    await view._restoreMapSelection({
      person: 'I1',
      personScope: 'self',
      year: null,
    })
    expect(view._handlePersonSelected).toHaveBeenLastCalledWith(
      {handle: 'p'},
      {focusBirth: true}
    )
    await view._restoreMapSelection({
      person: 'I1',
      personScope: 'self',
      year: 1800,
    })
    expect(view._handlePersonSelected).toHaveBeenLastCalledWith(
      {handle: 'p'},
      {focusBirth: false}
    )
  })

  it('includes the event year, place and event in the map link', () => {
    const event = new GrampsjsEvent()
    event.data = {
      handle: 'event1',
      date: {calendar: 0, modifier: 0, dateval: [1, 2, 1780, false]},
      extended: {place: {gramps_id: 'P1'}},
    }
    const nav = vi.fn()
    event.addEventListener('nav', nav)
    event._handleMapButtonClick()
    const url = new URL(
      nav.mock.calls[0][0].detail.path,
      'https://example.org/'
    )
    expect(url.searchParams.get('year')).toBe('1780')
    expect(url.searchParams.get('place')).toBe('P1')
    expect(url.searchParams.get('events')).toBe('event1')
  })
})
