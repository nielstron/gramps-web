import {describe, expect, it, vi} from 'vitest'

import {GrampsjsViewSearch} from '../../src/views/GrampsjsViewSearch.js'

describe('search summary projection', () => {
  it('requests card fields instead of complete object profiles', async () => {
    const view = new GrampsjsViewSearch()
    view.appState = {
      apiGet: vi.fn().mockResolvedValue({data: [], total_count: '0'}),
      i18n: {lang: 'de'},
    }
    view._objectTypes = {person: true}

    await view._fetchData('*', 1)

    expect(view.appState.apiGet).toHaveBeenCalledWith(
      '/api/search/?query=*&locale=de&summary=1&page=1&pagesize=20&type=person'
    )
  })
})
