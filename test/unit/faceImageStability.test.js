import {afterEach, describe, expect, it, vi} from 'vitest'
import {GrampsjsFaces} from '../../src/components/GrampsjsFaces.js'

const state = apiGet => ({i18n: {lang: 'en', strings: {}}, apiGet})
afterEach(() => document.body.replaceChildren())

async function faces(apiGet) {
  const el = new GrampsjsFaces()
  el.appState = state(apiGet)
  el.handle = 'photo'
  el.checksum = 'original'
  document.body.append(el)
  await el.updateComplete
  await Promise.resolve()
  await el.updateComplete
  return el
}

describe('stable image while annotating', () => {
  it('keeps the image slot mounted during face detection', async () => {
    let finish
    const el = await faces(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    const slot = el.shadowRoot.querySelector('slot')
    expect(slot).not.toBeNull()
    expect(el.shadowRoot.querySelector('[role="status"]')).not.toBeNull()
    finish({data: []})
    await Promise.resolve()
    await el.updateComplete
    expect(el.shadowRoot.querySelector('slot')).toBe(slot)
  })

  it('does not rerun detection for annotation or unrelated database changes', async () => {
    const apiGet = vi.fn().mockResolvedValue({data: []})
    const el = await faces(apiGet)
    el.active = true
    const slot = el.shadowRoot.querySelector('slot')
    window.dispatchEvent(new CustomEvent('db:changed'))
    await new Promise(resolve => setTimeout(resolve, 130))
    expect(apiGet).toHaveBeenCalledOnce()
    expect(el.shadowRoot.querySelector('slot')).toBe(slot)
  })

  it('detects again when the image file changes', async () => {
    const apiGet = vi.fn().mockResolvedValue({data: []})
    const el = await faces(apiGet)
    el.checksum = 'replacement'
    await el.updateComplete
    expect(apiGet).toHaveBeenCalledTimes(2)
  })
})

it('shows image loading until the original decodes, retaining the same image node', async () => {
  await import('../../src/components/GrampsjsImg.js')
  const el = document.createElement('grampsjs-img')
  Object.assign(el, {
    handle: 'photo',
    mime: 'image/jpeg',
    size: 400,
    full: true,
    loadingLabel: 'Loading image…',
  })
  document.body.append(el)
  await el.updateComplete
  const original = el.shadowRoot.querySelector('img.original')
  expect(el.shadowRoot.querySelector('[role="status"]')).not.toBeNull()
  original.decode = vi.fn().mockResolvedValue()
  original.dispatchEvent(new Event('load'))
  await Promise.resolve()
  await el.updateComplete
  expect(el.shadowRoot.querySelector('[role="status"]')).toBeNull()
  expect(el.shadowRoot.querySelector('img.original')).toBe(original)
})

it('stops the loading indicator if the original fails, keeping its preview', async () => {
  await import('../../src/components/GrampsjsImg.js')
  const el = document.createElement('grampsjs-img')
  Object.assign(el, {
    handle: 'photo',
    mime: 'image/jpeg',
    size: 400,
    full: true,
    loadingLabel: 'Loading image…',
  })
  document.body.append(el)
  await el.updateComplete
  el.shadowRoot.querySelector('img.original').dispatchEvent(new Event('error'))
  await el.updateComplete
  expect(el.shadowRoot.querySelector('[role="status"]')).toBeNull()
  expect(el.shadowRoot.querySelector('img[srcset]')).not.toBeNull()
})
