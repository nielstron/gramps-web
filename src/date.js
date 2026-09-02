/*
Date utility functions
*/

// eslint-disable-next-line class-methods-use-this
export function toDate(dateVal) {
  try {
    return `${dateVal[2]}-${dateVal[1]}-${dateVal[0]}`
  } catch {
    return ''
  }
}

function jsDate(year, month, day) {
  const date = new Date(Date.UTC(0, month - 1, day))
  date.setUTCFullYear(year)
  return date
}

function browserLocale() {
  return navigator.languages?.[0] || navigator.language
}

export function formatDateValue(dateVal, locale = browserLocale()) {
  const [day, month, year] = dateVal
  if (!year) return ''
  if (!month) return String(year)
  const options = {
    year: 'numeric',
    month: 'numeric',
    timeZone: 'UTC',
  }
  if (day) options.day = 'numeric'
  return new Intl.DateTimeFormat(locale, options).format(
    jsDate(year, month, day || 1)
  )
}

export function formatDateString(value, locale = browserLocale()) {
  if (!value) return ''
  return String(value).replace(
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    (match, year, month, day) =>
      formatDateValue([Number(day), Number(month), Number(year)], locale)
  )
}
