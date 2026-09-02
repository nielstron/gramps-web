import {describe, expect, it, vi} from 'vitest'

import {GrampsjsHomePerson} from '../../src/components/GrampsjsHomePerson.js'

describe('home person user settings', () => {
  it('stores the selected person through the authenticated user settings API', async () => {
    const component = new GrampsjsHomePerson()
    component.appState = {
      updateUserSettings: vi.fn().mockResolvedValue({
        data: {homePerson: 'I0042'},
      }),
    }
    const event = {
      detail: {objects: [{object: {gramps_id: 'I0042'}}]},
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    }

    await component._handleHomePerson(event)

    expect(component.appState.updateUserSettings).toHaveBeenCalledWith({
      homePerson: 'I0042',
    })
    expect(component.homePersonDetails).toEqual({gramps_id: 'I0042'})
  })
})
