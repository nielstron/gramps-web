import {afterEach, describe, expect, it, vi} from 'vitest'
import dayjs from 'dayjs/esm'
import '../../src/dayjs_locales.js'
import {prettyTimeDiffTimestamp} from '../../src/util.js'
import {GrampsjsViewSettingsUser} from '../../src/views/GrampsjsViewSettingsUser.js'
import {queryNominatim} from '../../src/api.js'
import '../../src/components/GrampsjsTimedelta.js'

afterEach(() => {
  vi.unstubAllGlobals()
  dayjs.locale('en')
})

describe('locale boundaries', () => {
  it('normalises external place-search language tags', async () => {
    const fetch = vi.fn().mockResolvedValue({ok: true, json: async () => []})
    vi.stubGlobal('fetch', fetch)
    await queryNominatim('London', {lang: 'en_GB'})
    const url = new URL(fetch.mock.calls[0][0])
    expect(url.searchParams.get('accept-language')).toBe('en-GB')
  })

  it('keeps each relative-time component language independent', () => {
    const component = document.createElement('grampsjs-timedelta')
    component.locale = 'de_AT'
    component.timestamp = 0
    dayjs.locale('en')
    component._updateString()
    expect(component.timestampString).toContain('vor')
    expect(dayjs.locale()).toBe('en')
  })
  it('formats API-key expiry with a Gramps regional locale', () => {
    const view = new GrampsjsViewSettingsUser()
    view.appState = {settings: {lang: 'en_GB'}}
    expect(view._formatApiKeyDate('2026-09-14')).toBe('14/09/2026')
  })

  it('does not change the global language when formatting relative times', () => {
    dayjs.locale('en')
    prettyTimeDiffTimestamp(0, 'de')
    expect(dayjs.locale()).toBe('en')
  })

  it('accepts either Portuguese locale spelling', () => {
    dayjs.locale('en')
    const hyphenated = prettyTimeDiffTimestamp(0, 'pt-PT')
    const underscored = prettyTimeDiffTimestamp(0, 'pt_PT')
    expect(hyphenated).toBe(underscored)
    dayjs.locale('en')
  })
})
