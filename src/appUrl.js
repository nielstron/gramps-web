// Rollup injects this value from the BASE_DIR build environment variable.
// Keeping it here gives application code one source of truth for internal URLs.
export const baseDir = globalThis.GRAMPSWEB_BASE_DIR ?? ''

export function appUrl(path = '', configuredBaseDir = baseDir) {
  return `${configuredBaseDir}${path}`
}

function normalizedBaseDir(configuredBaseDir) {
  if (!configuredBaseDir || configuredBaseDir === '/') return ''
  return `/${configuredBaseDir.split('/').filter(Boolean).join('/')}`
}

export function parseAppPath(path, configuredBaseDir = baseDir) {
  const pathname = String(path).split(/[?#]/, 1)[0]
  const prefix = normalizedBaseDir(configuredBaseDir)

  if (pathname === '/' || pathname === prefix || pathname === `${prefix}/`) {
    return {page: 'home', pageId: '', pageId2: '', pageId3: ''}
  }
  if (prefix && !pathname.startsWith(`${prefix}/`)) return null

  const relativePath = prefix
    ? pathname.slice(prefix.length + 1)
    : pathname.slice(1)
  const [page = '', pageId = '', pageId2 = '', pageId3 = ''] = relativePath
    .split('/')
    .map(segment => decodeURIComponent(segment))
  return {page, pageId, pageId2, pageId3}
}
