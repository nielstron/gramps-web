// App/API translation identifiers use underscores (en_GB); browser APIs and
// external services use BCP 47 tags (en-GB). Convert at those boundaries rather
// than changing the identifiers used for translation files and API requests.
export function toIntlLocale(locale = 'en') {
  return Intl.getCanonicalLocales((locale || 'en').replaceAll('_', '-'))[0]
}

export function toGrampsLocale(locale) {
  return toIntlLocale(locale).replaceAll('-', '_')
}

// Day.js has its own registry and calls European Portuguese "pt", not "pt-pt".
// Fall back explicitly instead of retaining the last globally selected locale.
export function toDayjsLocale(locale, registeredLocales) {
  const tag = toIntlLocale(locale).toLowerCase()
  const exact = tag === 'pt-pt' ? 'pt' : tag
  if (registeredLocales[exact]) return exact
  const language = tag.split('-')[0]
  return registeredLocales[language] ? language : 'en'
}
