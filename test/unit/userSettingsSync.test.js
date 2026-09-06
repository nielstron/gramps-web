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
