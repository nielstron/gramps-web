import {describe, expect, it} from 'vitest'
import dayjs from 'dayjs/esm'
import '../../src/dayjs_locales.js'
import {frontendLanguages} from '../../src/strings.js'
import {toDayjsLocale, toGrampsLocale, toIntlLocale} from '../../src/locale.js'

describe('locale identifiers', () => {
  it.each(frontendLanguages)('supports the configured language %s', locale => {
    const tag = toIntlLocale(locale)
    expect(() => new Intl.DateTimeFormat(tag).format(new Date())).not.toThrow()
    expect(() => new Intl.Collator(tag).compare('a', 'b')).not.toThrow()
    expect(toGrampsLocale(tag)).toBe(locale)
    expect(dayjs.Ls[toDayjsLocale(locale, dayjs.Ls)]).toBeDefined()
    // Bashkir has no Day.js translation; all other non-English UI languages do.
    if (!['ba', 'en'].includes(locale)) {
      expect(toDayjsLocale(locale, dayjs.Ls)).not.toBe('en')
    }
  })

  it('accepts hyphens, underscores, case variants and script subtags', () => {
    expect(toIntlLocale('EN_gb')).toBe('en-GB')
    expect(toIntlLocale('zh_Hant_TW')).toBe('zh-Hant-TW')
    expect(toIntlLocale('de-CH')).toBe('de-CH')
    expect(toGrampsLocale('pt-br')).toBe('pt_BR')
    expect(toIntlLocale()).toBe('en')
    expect(toIntlLocale('')).toBe('en')
  })

  it('uses explicit relative-time fallbacks and Portuguese aliases', () => {
    expect(toDayjsLocale('pt_PT', dayjs.Ls)).toBe('pt')
    expect(toDayjsLocale('pt-PT', dayjs.Ls)).toBe('pt')
    expect(toDayjsLocale('de_CH', dayjs.Ls)).toBe('de')
    expect(toDayjsLocale('en', dayjs.Ls)).toBe('en')
    expect(toDayjsLocale('ba', dayjs.Ls)).toBe('en')
  })
})
