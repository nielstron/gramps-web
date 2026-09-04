export function appScopePath(scope, path = '') {
  const scopePath = new URL(scope).pathname.replace(/\/$/, '')
  return `${scopePath}/${path.replace(/^\/+/, '')}`
}

export function appApiPathPattern(scope) {
  const apiPath = appScopePath(scope, 'api')
  const escaped = apiPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped}(?:/|$)`)
}
