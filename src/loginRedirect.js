import {appUrl, baseDir} from './appUrl.js'

export function getLoginUrl(
  location = window.location,
  configuredBaseDir = baseDir
) {
  const requestedPath = `${location.pathname}${location.search}${location.hash}`
  return `${appUrl('/login', configuredBaseDir)}?next=${encodeURIComponent(
    requestedPath
  )}`
}

export function getLoginReturnUrl(
  location = window.location,
  configuredBaseDir = baseDir
) {
  const fallback = appUrl('/', configuredBaseDir)
  const next = new URLSearchParams(location.search).get('next')
  if (!next) return fallback

  let target
  try {
    target = new URL(next, location.origin)
  } catch {
    return fallback
  }
  const baseRoot = appUrl('/', configuredBaseDir)
  const baseWithoutSlash = baseRoot.replace(/\/$/, '')
  if (
    target.origin !== location.origin ||
    (target.pathname !== baseWithoutSlash &&
      !target.pathname.startsWith(baseRoot))
  ) {
    return fallback
  }
  return `${target.pathname}${target.search}${target.hash}`
}
