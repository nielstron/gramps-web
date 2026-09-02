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

function formatMonthAndYear(date, locale) {
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(date)
  const dayIndex = parts.findIndex(({type}) => type === 'day')
  const removedIndexes = new Set([dayIndex])
  const previous = parts[dayIndex - 1]
  const next = parts[dayIndex + 1]
  const nextIsTrailingSuffix =
    next?.type === 'literal' &&
    parts.slice(dayIndex + 2).every(({type}) => type === 'literal')

  if (dayIndex === 0 && next?.type === 'literal') {
    removedIndexes.add(dayIndex + 1)
  } else if (nextIsTrailingSuffix) {
    removedIndexes.add(dayIndex + 1)
  } else if (previous?.type === 'literal') {
    removedIndexes.add(dayIndex - 1)
  } else if (next?.type === 'literal') {
    removedIndexes.add(dayIndex + 1)
  }

  return parts
    .filter((_, index) => !removedIndexes.has(index))
    .map(({value}) => value)
    .join('')
}

export function formatDateValue(dateVal, locale = browserLocale()) {
  const [day, month, year] = dateVal
  if (!year) return ''
  if (!month) return String(year)
  const date = jsDate(year, month, day || 1)
  if (!day) return formatMonthAndYear(date, locale)
  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  }
  return new Intl.DateTimeFormat(locale, options).format(date)
}

export function formatDateString(value, locale = browserLocale()) {
  if (!value) return ''
  return String(value).replace(
    /\b(\d{4})-(\d{2})(?:-(\d{2}))?\b/g,
    (match, year, month, day) =>
      formatDateValue(
        [day ? Number(day) : 0, Number(month), Number(year)],
        locale
      )
  )
}
