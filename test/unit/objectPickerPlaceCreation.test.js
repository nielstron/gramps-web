import {describe, expect, it, vi} from 'vitest'

import {GrampsjsObjectPickerDialog} from '../../src/components/GrampsjsObjectPickerDialog.js'

describe('place creation in object picker', () => {
  it('creates and selects a place without leaving the picker workflow', async () => {
    const apiPost = vi.fn().mockResolvedValue({
      data: [
        {
          new: {
            _class: 'Place',
            handle: 'place-handle',
            gramps_id: 'P0042',
          },
        },
      ],
    })
    const apiGet = vi.fn().mockResolvedValue({
      data: {
        _class: 'Place',
        handle: 'place-handle',
        gramps_id: 'P0042',
        name: {_class: 'PlaceName', value: 'Bern'},
      },
    })
    const picker = new GrampsjsObjectPickerDialog()
    picker.objectType = 'place'
    picker.appState = {
      apiPost,
      apiGet,
      i18n: {lang: 'en', strings: {}},
      permissions: {canAdd: true},
    }
    picker._close = vi.fn()
    let selected
    picker.addEventListener('select-object:selected', event => {
      selected = event.detail
    })

    await picker._createPlace('Bern')

    expect(apiPost).toHaveBeenCalledWith('/api/places/', {
      _class: 'Place',
      name: {_class: 'PlaceName', value: 'Bern'},
      place_type: 'Unknown',
    })
    expect(apiGet).toHaveBeenCalledWith(
      '/api/places/place-handle?extend=all&profile=all&locale=en'
    )
    expect(selected).toEqual({
      object_type: 'place',
      object: expect.objectContaining({
        handle: 'place-handle',
        name: {_class: 'PlaceName', value: 'Bern'},
      }),
      handle: 'place-handle',
    })
  })
})
