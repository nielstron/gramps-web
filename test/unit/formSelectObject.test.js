import {describe, expect, it, vi} from 'vitest'

import {objectPickerButtonLabel} from '../../src/components/GrampsjsFormSelectObject.js'
import '../../src/components/GrampsjsFormSelectObjectList.js'

describe('object selection event ownership', () => {
  it('stops an accepted selection change at its immediate list owner', () => {
    const list = document.createElement('grampsjs-form-select-object-list')
    const objectList = {objects: []}
    Object.defineProperty(list, 'shadowRoot', {
      value: {querySelector: () => objectList},
    })
    const stopPropagation = vi.fn()

    list._handleSelectObjectsChanged({
      detail: {objects: [{handle: 'place-1'}]},
      stopPropagation,
    })

    expect(stopPropagation).toHaveBeenCalledOnce()
    expect(objectList.objects).toEqual([{handle: 'place-1'}])
  })

  it('ignores selections emitted by a picker nested inside its dialog', async () => {
    const selector = document.createElement('grampsjs-form-select-object')
    selector.objectType = 'citation'
    const changed = vi.fn()
    selector.addEventListener('select-object:changed', changed)
    const picker = document.createElement('div')
    const nestedPicker = document.createElement('div')
    selector._handleSelected({
      currentTarget: picker,
      composedPath: () => [nestedPicker, picker],
      detail: {
        object_type: 'source',
        handle: 'source-handle',
        object: {handle: 'source-handle'},
      },
    })

    expect(selector.objects).toEqual([])
    expect(changed).not.toHaveBeenCalled()
  })

  it('rejects a retargeted selection owned by a nested picker', () => {
    const selector = document.createElement('grampsjs-form-select-object')
    const picker = document.createElement('div')
    picker.pickerId = 'outer-picker'
    selector._handleSelected({
      currentTarget: picker,
      composedPath: () => [picker],
      detail: {
        picker_id: 'inner-picker',
        object_type: 'place',
        handle: 'inner-place',
        object: {handle: 'inner-place'},
      },
    })

    expect(selector.objects).toEqual([])
  })

  it('accepts a selection emitted by its own dialog', async () => {
    const selector = document.createElement('grampsjs-form-select-object')
    selector.objectType = 'citation'
    const picker = document.createElement('div')
    picker.pickerId = 'own-picker'
    selector._handleSelected({
      currentTarget: picker,
      composedPath: () => [picker],
      detail: {
        picker_id: 'own-picker',
        object_type: 'citation',
        handle: 'citation-handle',
        object: {handle: 'citation-handle'},
      },
    })

    expect(selector.objects.map(object => object.handle)).toEqual([
      'citation-handle',
    ])
  })
})

describe('object picker labels', () => {
  it.each([
    ['person', 'Add or link person'],
    ['place', 'Add or link place'],
    ['citation', 'Add or link citation'],
    ['source', 'Add or link source'],
    ['media', 'Add or link media object'],
    ['event', 'Add or link event'],
    ['note', 'Add or link note'],
    ['family', 'Add or link family'],
    ['repository', 'Add or link repository'],
  ])('describes the complete %s picker flow', async (objectType, label) => {
    expect(objectPickerButtonLabel[objectType]).toBe(label)
  })
})
