import {afterEach, expect, test} from 'vitest'
import {localStorage as appStorage, scopedStorage} from '../../src/storage.js'

afterEach(() => {
  localStorage.clear()
  delete window.grampsjsConfig
})

test('demo storage does not change the production session', () => {
  localStorage.setItem('access_token', 'production')
  const demo = scopedStorage(localStorage, 'demo')
  demo.setItem('access_token', 'demo-token')
  expect(demo.getItem('access_token')).toBe('demo-token')
  expect(localStorage.getItem('access_token')).toBe('production')
  demo.removeItem('access_token')
  expect(demo.getItem('access_token')).toBeNull()
  expect(localStorage.getItem('access_token')).toBe('production')
})

test('default storage retains existing keys', () => {
  const storage = scopedStorage(localStorage, '')
  storage.setItem('access_token', 'existing-session')
  expect(localStorage.getItem('access_token')).toBe('existing-session')
})

test('application storage reads configuration when used, not when imported', () => {
  appStorage.setItem('access_token', 'existing-session')
  window.grampsjsConfig = {storageNamespace: 'second-installation'}
  expect(appStorage.getItem('access_token')).toBeNull()
  appStorage.setItem('access_token', 'separate-session')
  expect(appStorage.getItem('access_token')).toBe('separate-session')
  appStorage.removeItem('access_token')
  expect(appStorage.getItem('access_token')).toBeNull()
  delete window.grampsjsConfig
  expect(appStorage.getItem('access_token')).toBe('existing-session')
})
