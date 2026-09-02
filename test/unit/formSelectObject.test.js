import {describe, expect, it, vi} from 'vitest'

import '../../src/components/GrampsjsFormSelectObject.js'

describe('object selection event ownership', () => {
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

  it('accepts a selection emitted by its own dialog', async () => {
    const selector = document.createElement('grampsjs-form-select-object')
    selector.objectType = 'citation'
    const picker = document.createElement('div')
    selector._handleSelected({
      currentTarget: picker,
      composedPath: () => [picker],
      detail: {
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
