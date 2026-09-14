import {afterEach, describe, expect, it, vi} from 'vitest'
import '../../src/components/GrampsjsImg.js'
import {render} from 'lit'
import {GrampsjsViewMediaLightbox} from '../../src/views/GrampsjsViewMediaLightbox.js'

afterEach(() => document.body.replaceChildren())

async function preview() {
  const el = document.createElement('grampsjs-img')
  Object.assign(el, {handle: 'one', mime: 'image/jpeg', size: 1000, full: true})
  document.body.append(el)
  await el.updateComplete
  return el
}

describe('progressive full image', () => {
  it('loads originals only after opening the lightbox, using a small preview', () => {
    const view = new GrampsjsViewMediaLightbox()
    view._data = {handle: 'one', mime: 'image/jpeg'}
    const container = document.createElement('div')
    render(view._renderImage(), container)
    expect(container.querySelector('grampsjs-img').hasAttribute('full')).toBe(
      false
    )
    view.open()
    render(view._renderImage(), container)
    expect(container.querySelector('grampsjs-img').hasAttribute('full')).toBe(
      true
    )
    expect(container.querySelector('grampsjs-img').getAttribute('size')).toBe(
      '400'
    )
  })
  it('keeps the thumbnail until the original finishes decoding', async () => {
    const el = await preview()
    const original = el.shadowRoot.querySelector('img.original')
    expect(original).not.toBeNull()
    expect(original.style.display).toBe('none')
    expect(el.shadowRoot.querySelector('img[srcset]')).not.toBeNull()
    let decoded
    original.decode = vi.fn(
      () =>
        new Promise(resolve => {
          decoded = resolve
        })
    )
    original.dispatchEvent(new Event('load'))
    expect(el._fullLoaded).toBe(false)
    decoded()
    await Promise.resolve()
    await el.updateComplete
    expect(original.style.display).not.toBe('none')
    expect(el.shadowRoot.querySelector('img[srcset]')).toBeNull()
  })

  it('keeps the preview when the original fails', async () => {
    const el = await preview()
    const original = el.shadowRoot.querySelector('img.original')
    expect(original).not.toBeNull()
    original.dispatchEvent(new Event('error'))
    await el.updateComplete
    expect(el.shadowRoot.querySelector('img[srcset]')).not.toBeNull()
    expect(el._error).toBe(false)
  })

  it('ignores a late decode after navigating to another image', async () => {
    const el = await preview()
    const original = el.shadowRoot.querySelector('img.original')
    expect(original).not.toBeNull()
    let decoded
    original.decode = () =>
      new Promise(resolve => {
        decoded = resolve
      })
    original.dispatchEvent(new Event('load'))
    el.handle = 'two'
    await el.updateComplete
    decoded()
    await Promise.resolve()
    await el.updateComplete
    expect(el._fullLoaded).toBe(false)
  })
})
