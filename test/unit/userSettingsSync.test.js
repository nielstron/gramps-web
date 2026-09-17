import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {GrampsJs} from '../../src/GrampsJs.js'
import {getInitialAppState} from '../../src/appState.js'
import {GrampsjsViewSettingsUser} from '../../src/views/GrampsjsViewSettingsUser.js'

describe('server-synchronized user settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the server-side home person when local settings change', () => {
    localStorage.setItem('grampsjs_settings', JSON.stringify({theme: 'dark'}))
    const app = Object.create(GrampsJs.prototype)
    app.appState = {settings: {homePerson: 'I0042'}}
    app._homePersonLoadedId = 'I0042'

    app._handleSettings()

    expect(app.appState.settings).toEqual({theme: 'dark', homePerson: 'I0042'})
  })

  it('does not fetch an already loaded home person a second time', () => {
    const app = Object.create(GrampsJs.prototype)
    app.appState = {
      settings: {homePerson: 'I0042'},
      apiGet: vi.fn(),
    }
    app._homePersonLoadedId = 'I0042'
    app._homePersonFetchingId = null

    app._loadHomePersonInfo()

    expect(app.appState.apiGet).not.toHaveBeenCalled()
  })

  it('loads home-person card data with the user settings request', async () => {
    const details = {handle: 'P42', gramps_id: 'I0042'}
    const app = Object.create(GrampsJs.prototype)
    app.appState = {
      auth: {claims: {sub: 'user1', tree: 'tree1'}},
      apiGet: vi.fn().mockResolvedValue({
        data: {homePerson: 'I0042', homePersonDetails: details},
      }),
    }
    app._handleUserSettings = vi.fn()

    await app._loadUserSettings()

    expect(app.appState.apiGet).toHaveBeenCalledWith(
      '/api/users/-/settings?include_home_person=1'
    )
    expect(app._homePersonDetails).toBe(details)
    expect(app._homePersonLoadedId).toBe('I0042')
  })

  it('refreshes loaded home-person details after a database change', () => {
    const app = Object.create(GrampsJs.prototype)
    app.appState = {
      settings: {homePerson: 'I0042'},
      apiGet: vi.fn().mockResolvedValue({data: {person: {handle: 'P42'}}}),
    }
    app._homePersonLoadedId = 'I0042'
    app._homePersonFetchingId = null

    app._loadHomePersonInfo(true)

    expect(app.appState.apiGet).toHaveBeenCalledWith(
      '/api/views/home-person/I0042'
    )
  })

  it('matches an unset home person after login and applies the saved result', async () => {
    const app = Object.create(GrampsJs.prototype)
    app.appState = {
      auth: {claims: {sub: 'user1', tree: 'tree1'}},
      apiGet: vi.fn().mockResolvedValue({data: {}}),
      apiPost: vi.fn().mockResolvedValue({data: {homePerson: 'I42'}}),
    }
    app._handleUserSettings = vi.fn()
    await app._loadUserSettings()
    expect(app.appState.apiPost).toHaveBeenCalledWith(
      '/api/users/-/settings/home-person/match',
      {},
      {dbChanged: false}
    )
    expect(app._handleUserSettings).toHaveBeenCalledWith({homePerson: 'I42'})
    await app._loadUserSettings()
    expect(app.appState.apiPost).toHaveBeenCalledOnce()
  })

  it.each(['I42', '', null])(
    'preserves an explicit home-person setting (%s)',
    async homePerson => {
      const app = Object.create(GrampsJs.prototype)
      app.appState = {
        auth: {claims: {sub: 'user1', tree: 'tree1'}},
        apiGet: vi.fn().mockResolvedValue({data: {homePerson}}),
        apiPost: vi.fn(),
      }
      app._handleUserSettings = vi.fn()
      await app._loadUserSettings()
      expect(app.appState.apiPost).not.toHaveBeenCalled()
      expect(app._handleUserSettings).toHaveBeenCalledWith({homePerson})
    }
  )

  it('continues loading settings when matching fails', async () => {
    const app = Object.create(GrampsJs.prototype)
    app.appState = {
      auth: {claims: {sub: 'user1', tree: 'tree1'}},
      apiGet: vi.fn().mockResolvedValue({data: {appearance: {theme: 'dark'}}}),
      apiPost: vi.fn().mockResolvedValue({error: 'Tree unavailable'}),
    }
    app._handleUserSettings = vi.fn()
    await app._loadUserSettings()
    expect(app._handleUserSettings).toHaveBeenCalledWith({
      appearance: {theme: 'dark'},
    })
  })

  it('writes appearance changes through the synchronized settings method', () => {
    const view = new GrampsjsViewSettingsUser()
    view.appState = {updateAppearanceSettings: vi.fn()}

    view._handleLangSelected({target: {value: 'de'}})
    view._handleDefaultTreeViewChange({target: {value: 'relationship'}})

    expect(view.appState.updateAppearanceSettings).toHaveBeenNthCalledWith(1, {
      lang: 'de',
    })
    expect(view.appState.updateAppearanceSettings).toHaveBeenNthCalledWith(2, {
      treeDefaultView: 'relationship',
    })

    view._handleAnniversaryRelationshipDegreeChange({target: {value: '5'}})
    expect(view.appState.updateAppearanceSettings).toHaveBeenNthCalledWith(3, {
      anniversaryRelationshipDegree: 5,
    })
  })

  it('uses server appearance settings and caches them for the next startup', () => {
    localStorage.setItem('grampsjs_settings', JSON.stringify({theme: 'light'}))
    const app = Object.create(GrampsJs.prototype)
    app.appState = {
      settings: {},
      cacheAppearanceSettings: vi.fn(settings => {
        localStorage.setItem('grampsjs_settings', JSON.stringify(settings))
      }),
    }
    app._homePersonLoadedId = 'I0042'

    app._handleUserSettings({
      homePerson: 'I0042',
      appearance: {theme: 'dark', lang: 'de'},
    })

    expect(app.appState.cacheAppearanceSettings).toHaveBeenCalledWith({
      theme: 'dark',
      lang: 'de',
    })
    expect(app.appState.settings).toEqual({
      theme: 'dark',
      lang: 'de',
      homePerson: 'I0042',
    })
  })

  it('updates the local cache immediately and patches the account settings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: () =>
          Promise.resolve({
            homePerson: 'I0042',
            appearance: {theme: 'dark'},
          }),
        headers: {get: () => null},
      })
    )
    const appState = getInitialAppState('/settings')
    appState.auth.getValidAccessToken = vi.fn().mockResolvedValue('token')

    await appState.updateAppearanceSettings({theme: 'dark'})

    expect(JSON.parse(localStorage.getItem('grampsjs_settings'))).toEqual({
      theme: 'dark',
    })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/-/settings'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({appearance: {theme: 'dark'}}),
      })
    )
  })
})
