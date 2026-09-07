export const DEFAULT_MAP_YEAR_LOOKBACK = 200

export function defaultMapTimeRange(currentYear = new Date().getFullYear()) {
  const yearStart = currentYear - DEFAULT_MAP_YEAR_LOOKBACK
  const yearEnd = currentYear
  const span = DEFAULT_MAP_YEAR_LOOKBACK / 2
  return {
    value: yearStart + span,
    span,
    yearStart,
    yearEnd,
  }
}
