import {describe, expect, it, vi} from 'vitest'

import {GrampsjsObjectPickerDialog} from '../../src/components/GrampsjsObjectPickerDialog.js'

function templateMarkup(template) {
  if (template === undefined || template === null) return ''
  if (Array.isArray(template)) return template.map(templateMarkup).join('')
  if (!template?.strings) return String(template)
  return template.strings.reduce(
    (result, string, index) =>
      `${result}${string}${templateMarkup(template.values[index])}`,
    ''
  )
}

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

describe('citation creation in object picker', () => {
  it('offers to create a citation when citations can be added', async () => {
    const picker = new GrampsjsObjectPickerDialog()
    picker.objectType = 'citation'
    picker.appState = {
      i18n: {lang: 'en', strings: {}},
      permissions: {canAdd: true},
    }

    expect(templateMarkup(picker.render())).toContain('New Citation')

    await picker._openCreateCitation()
    expect(templateMarkup(picker.render())).toContain(
      '<grampsjs-form-new-citation'
    )
  }, 15_000)

  it('creates and selects a citation without leaving the picker workflow', async () => {
    let postedCitation
    const apiPost = vi.fn().mockImplementation(async (_url, citation) => {
      postedCitation = citation
      return {
        data: [{new: {...citation, gramps_id: 'C0042'}}],
      }
    })
    const apiGet = vi.fn().mockImplementation(async () => ({
      data: {...postedCitation, gramps_id: 'C0042', page: 'p. 12'},
    }))
    const picker = new GrampsjsObjectPickerDialog()
    picker.objectType = 'citation'
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
    const event = {
      detail: {
        data: {
          _class: 'Citation',
          confidence: 2,
          source_handle: 'source-handle',
          page: 'p. 12',
        },
      },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    }

    await picker._createCitation(event)

    expect(apiPost).toHaveBeenCalledWith(
      '/api/citations/',
      expect.objectContaining({
        _class: 'Citation',
        handle: expect.any(String),
        source_handle: 'source-handle',
        page: 'p. 12',
      })
    )
    expect(apiGet).toHaveBeenCalledWith(
      `/api/citations/${postedCitation.handle}?extend=all&profile=all&locale=en`
    )
    expect(selected).toEqual({
      object_type: 'citation',
      object: expect.objectContaining({
        handle: postedCitation.handle,
        gramps_id: 'C0042',
        page: 'p. 12',
      }),
      handle: postedCitation.handle,
    })
  })
})
