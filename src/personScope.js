export const PERSON_SCOPE_SELF = 'self'
export const PERSON_SCOPE_ANCESTORS = 'ancestors'
export const PERSON_SCOPE_DESCENDANTS = 'descendants'

export function personScopeOptions(translate = value => value) {
  return [
    {value: PERSON_SCOPE_SELF, label: translate('Person')},
    {value: PERSON_SCOPE_ANCESTORS, label: translate('Ancestors')},
    {value: PERSON_SCOPE_DESCENDANTS, label: translate('Descendants')},
  ]
}

export function personScopeRules(grampsId, mode, generations = 100) {
  if (!grampsId || mode === PERSON_SCOPE_SELF) return null
  const name =
    mode === PERSON_SCOPE_ANCESTORS
      ? 'IsLessThanNthGenerationAncestorOf'
      : 'IsLessThanNthGenerationDescendantOf'
  return {rules: [{name, values: [grampsId, generations]}]}
}
