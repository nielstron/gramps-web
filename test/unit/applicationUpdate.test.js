import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {GrampsjsUpdateAvailable} from '../../src/components/GrampsjsUpdateAvailable.js'

describe('application updates', () => {
  let serviceWorker
  let registration
  let element
  let reload

  beforeEach(() => {
    registration = new EventTarget()
    registration.waiting = {postMessage: vi.fn()}
    serviceWorker = new EventTarget()
    serviceWorker.controller = {}
    serviceWorker.getRegistration = vi.fn().mockResolvedValue(registration)
    vi.stubGlobal('navigator', {serviceWorker})
    reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {})
    element = new GrampsjsUpdateAvailable()
  })

  afterEach(() => {
    element.disconnectedCallback?.()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows the available update without reloading on a controller change', async () => {
    await element.connectedCallback()
    expect(element.hasAttribute('hidden')).toBe(false)
    serviceWorker.dispatchEvent(new Event('controllerchange'))
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads only the tab that explicitly accepts the update', async () => {
    await element.connectedCallback()
    await element._postMessage(new Event('click'))
    expect(registration.waiting.postMessage).toHaveBeenCalledWith({
      type: 'SKIP_WAITING',
    })
    expect(reload).not.toHaveBeenCalled()
    serviceWorker.dispatchEvent(new Event('controllerchange'))
    expect(reload).toHaveBeenCalledTimes(1)
    serviceWorker.dispatchEvent(new Event('controllerchange'))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('requires clicking the Refresh action, not the notification text', async () => {
    await element.connectedCallback()
    element.click()
    await Promise.resolve()
    expect(registration.waiting.postMessage).not.toHaveBeenCalled()
    const button = document.createElement('button')
    button.slot = 'action'
    element.append(button)
    button.click()
    await Promise.resolve()
    expect(registration.waiting.postMessage).toHaveBeenCalledWith({
      type: 'SKIP_WAITING',
    })
  })
})
