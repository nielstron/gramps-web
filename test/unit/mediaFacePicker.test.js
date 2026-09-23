import {describe, expect, it, vi} from 'vitest'
import {render} from 'lit'
import {GrampsjsFaceAnnotations} from '../../src/components/GrampsjsFaceAnnotations.js'
import {GrampsjsMediaObject} from '../../src/components/GrampsjsMediaObject.js'
import {GrampsjsObjectPickerDialog} from '../../src/components/GrampsjsObjectPickerDialog.js'
import {GrampsjsViewMediaLightbox} from '../../src/views/GrampsjsViewMediaLightbox.js'
import {linkFace, linkedPeople} from '../../src/mediaAnnotations.js'

const marie = {
  handle: 'marie',
  primary_name: {first_name: 'Marie'},
  media_list: [{ref: 'photo', rect: []}],
}
const result = {handle: 'marie', object_type: 'person', object: marie}
const data = {
  handle: 'photo',
  mime: 'image/jpeg',
  extended: {backlinks: {person: [marie]}},
}
function appState() {
  return {
    i18n: {lang: 'en', strings: {}},
    permissions: {canEdit: true},
    apiGet: vi.fn().mockResolvedValue({data: structuredClone(marie)}),
    apiPut: vi.fn().mockResolvedValue({data: []}),
  }
}
function editor() {
  const el = new GrampsjsFaceAnnotations()
  el.appState = appState()
  el.data = data
  el.selected = {rect: [12, 21, 43, 61]}
  return el
}

describe('face annotation picker', () => {
  it('can find the same person again after tagging a photo', async () => {
    const el = editor()
    const container = document.createElement('div')
    render(el.render(), container, {host: el})
    const selector = container.querySelector('grampsjs-form-select-object')
    selector.objects = [result]
    await el._link({
      detail: {objects: [result]},
      currentTarget: selector,
      stopPropagation() {},
    })
    const picker = new GrampsjsObjectPickerDialog()
    picker.appState = {
      ...appState(),
      apiGet: vi.fn().mockResolvedValue({data: [result]}),
    }
    picker.excludeHandles = selector._handleList()
    await picker._fetchSearchData('Marie Merck', picker._fetchId)
    expect(picker._data).toEqual([result])
  })

  it('opens on linked people without waiting for another server request', async () => {
    const picker = new GrampsjsObjectPickerDialog()
    picker.appState = appState()
    picker.suggestedObjects = linkedPeople(data)
    picker._mode = picker._defaultMode()
    await picker._fetchData()
    expect(picker._data.map(p => p.handle)).toEqual(['marie'])
    expect(picker.appState.apiGet).not.toHaveBeenCalled()
    expect(picker._sidebarModes()[0]).toBe('suggested')
  })

  it('ranks matching linked people first without adding nonmatching people', async () => {
    const picker = new GrampsjsObjectPickerDialog()
    const other = {
      handle: 'other',
      object_type: 'person',
      object: {handle: 'other'},
    }
    picker.appState = {
      ...appState(),
      apiGet: vi.fn().mockResolvedValue({data: [other, result]}),
    }
    picker.suggestedObjects = [result, {handle: 'unmatched'}]
    await picker._fetchSearchData('Marie', picker._fetchId)
    expect(picker._data.map(p => p.handle)).toEqual(['marie', 'other'])
  })

  it('uses the shared annotation editor on the details page', () => {
    const media = new GrampsjsMediaObject()
    media.appState = appState()
    media.data = data
    const container = document.createElement('div')
    render(media._renderImageEdit(), container)
    expect(container.querySelector('grampsjs-face-annotations').data).toBe(data)
  })
})

describe('annotation saving', () => {
  it('preserves primary-photo order and existing reference metadata', async () => {
    const state = appState()
    state.apiGet.mockResolvedValue({
      data: {
        ...marie,
        media_list: [
          {ref: 'photo', rect: [], citation_list: ['citation'], private: true},
          {ref: 'other-photo', rect: []},
        ],
      },
    })
    await linkFace(state, {
      personHandle: 'marie',
      mediaHandle: 'photo',
      rect: [12, 21, 43, 61],
    })
    const saved = state.apiPut.mock.calls[0][1]
    expect(saved.media_list).toEqual([
      {
        ref: 'photo',
        rect: [12, 21, 43, 61],
        citation_list: ['citation'],
        private: true,
      },
      {ref: 'other-photo', rect: []},
    ])
  })

  it('keeps the selection available when saving fails', async () => {
    const el = editor()
    el.appState.apiPut.mockResolvedValue({error: 'Save failed'})
    await el._saveLink(result)
    expect(el.selected.rect).toEqual([12, 21, 43, 61])
    expect(el.saving).toBe(false)
  })

  it('associates one detected face with the sole linked person only once', async () => {
    const el = editor()
    const event = {detail: {rects: [[12, 21, 43, 61]]}, stopPropagation() {}}
    await el._autoLink(event)
    await el._autoLink(event)
    expect(el.appState.apiPut).toHaveBeenCalledOnce()
    expect(el.appState.apiPut.mock.calls[0][0]).toBe('/api/people/marie')
  })

  it('preserves an annotation added since the editor loaded', async () => {
    const el = editor()
    el.appState.apiGet.mockResolvedValue({
      data: {
        ...marie,
        media_list: [{ref: 'photo', rect: [10, 20, 40, 70]}],
      },
    })
    await el._autoLink({
      detail: {rects: [[12, 21, 43, 61]]},
      stopPropagation() {},
    })
    expect(el.appState.apiPut).not.toHaveBeenCalled()
  })

  it.each([
    'multiple people',
    'multiple faces',
    'already annotated',
    'read only',
  ])('does not auto-associate when %s', async reason => {
    const el = editor()
    el.data = structuredClone(data)
    const event = {detail: {rects: [[12, 21, 43, 61]]}, stopPropagation() {}}
    if (reason === 'multiple people')
      el.data.extended.backlinks.person.push({...marie, handle: 'other'})
    if (reason === 'multiple faces') event.detail.rects.push([60, 20, 80, 50])
    if (reason === 'already annotated')
      el.data.extended.backlinks.person[0].media_list[0].rect = [10, 20, 40, 70]
    if (reason === 'read only') el.appState.permissions.canEdit = false
    await el._autoLink(event)
    expect(el.appState.apiPut).not.toHaveBeenCalled()
  })
})

describe('large-image annotation controls', () => {
  it('starts with no outlines and enters tagging directly, resetting zoom', () => {
    const view = new GrampsjsViewMediaLightbox()
    view.appState = appState()
    view._data = data
    expect(view.rectHidden).toBe(true)
    view._zoom = 2
    view._handleToggleRectButtonClick()
    const container = document.createElement('div')
    render(view._innerContainerContentImage(), container)
    expect(container.querySelector('grampsjs-face-annotations')).not.toBeNull()
    expect(view._zoom).toBe(1)
    view._handleToggleRectButtonClick()
    expect(view.editRect).toBe(false)
    expect(view.rectHidden).toBe(true)
  })

  it('lets read-only viewers show outlines without entering editing', () => {
    const view = new GrampsjsViewMediaLightbox()
    view.appState = {...appState(), permissions: {canEdit: false}}
    view._handleToggleRectButtonClick()
    expect(view.editRect).toBe(false)
    expect(view.rectHidden).toBe(false)
  })
})
