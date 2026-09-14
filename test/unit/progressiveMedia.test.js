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
    view.attachShadow({mode: 'open'})
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
    expect(
      container.querySelector('grampsjs-img').hasAttribute('fit-viewport')
    ).toBe(true)
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

describe('mobile lightbox gestures', () => {
  it('does not process a touch as mouse dragging as well', () => {
    const view = new GrampsjsViewMediaLightbox()
    view._zoom = 2
    const capture = vi.fn()
    view._handlePointerDown({
      pointerType: 'touch',
      currentTarget: {setPointerCapture: capture},
    })
    expect(capture).not.toHaveBeenCalled()
  })

  it('continues panning from the remaining finger after a pinch', () => {
    const view = new GrampsjsViewMediaLightbox()
    view._zoom = 2
    const event = x => ({
      touches: [{clientX: x, clientY: 50}],
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    })
    view._handleTouchEnd(event(100))
    view._handleTouchMove(event(110))
    expect(view._panX).toBe(10)
    expect(view._panY).toBe(0)
  })
})

describe('shared thumbnail previews', () => {
  it('shows a small matching crop until the requested thumbnail is decoded', async () => {
    const el = await preview()
    el.full = false
    el.rect = [10, 20, 80, 90]
    await el.updateComplete
    const small = el.shadowRoot.querySelector('img.preview')
    expect(small).not.toBeNull()
    expect(small.src).toContain('/100')
    const large = el.shadowRoot.querySelector('img[srcset]')
    expect(new URL(small.src).pathname.replace('/100', '/1000')).toBe(
      new URL(large.src).pathname
    )
    large.decode = vi.fn().mockResolvedValue()
    large.dispatchEvent(new Event('load'))
    await Promise.resolve()
    await el.updateComplete
    expect(el.shadowRoot.querySelector('img.preview')).toBeNull()
  })
})
