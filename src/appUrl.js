// Rollup injects this value from the BASE_DIR build environment variable.
// Keeping it here gives application code one source of truth for internal URLs.
export const baseDir = globalThis.GRAMPSWEB_BASE_DIR ?? ''

export function appUrl(path = '', configuredBaseDir = baseDir) {
  return `${configuredBaseDir}${path}`
}
