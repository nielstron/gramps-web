import {describe, expect, it, vi} from 'vitest'

import {participantHandles} from '../../src/anniversaries.js'
import {GrampsjsViewAnniversaries} from '../../src/views/GrampsjsViewAnniversaries.js'

function eventWithParticipants(people = [], families = []) {
  return {
    profile: {
      participants: {
        people: people.map(handle => ({person: {handle}})),
        families: families.map(([father, mother]) => ({
          family: {father: {handle: father}, mother: {handle: mother}},
        })),
      },
    },
  }
}

describe('anniversary relationship filtering', () => {
  it('is immediately empty when no home person is set', () => {
    const view = new GrampsjsViewAnniversaries()

    expect(view.getUrl()).toBe('')
    expect(view.loading).toBe(false)
    expect(view._data).toEqual({data: []})
  })

  it('collects and deduplicates direct and family participants', () => {
    const event = eventWithParticipants(['P1', 'P2'], [['P2', 'P3']])
    expect(participantHandles(event)).toEqual(['P1', 'P2', 'P3'])
  })

  it('requests already-scoped anniversaries from one backend view', () => {
    const view = new GrampsjsViewAnniversaries()
    view.homePersonHandle = 'HOME'
    view.relationshipDegree = 2
    view.appState = {i18n: {lang: 'de'}}

    expect(view.getUrl()).toMatch(
      /^\/api\/views\/anniversaries\/HOME\?month=\d+&day=\d+&degree=2&limit=10&locale=de$/
    )
  })

  it('uses the compound response without issuing per-participant requests', async () => {
    const view = new GrampsjsViewAnniversaries()
    const events = [{handle: 'E1'}]
    view.appState = {
      apiGet: vi.fn().mockResolvedValue({data: {events}}),
    }
    view._fireUpdateEvent = vi.fn()

    await view._updateGetData('/api/views/anniversaries/HOME')

    expect(view._data.data).toEqual(events)
    expect(view.appState.apiGet).toHaveBeenCalledOnce()
  })
})
