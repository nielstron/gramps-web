import {describe, expect, it, vi} from 'vitest'

import {GrampsjsViewMap} from '../../src/views/GrampsjsViewMap.js'

describe('map person scope', () => {
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
