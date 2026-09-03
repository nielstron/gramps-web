import {describe, expect, it, vi} from 'vitest'

import {GrampsjsObjectPickerDialog} from '../../src/components/GrampsjsObjectPickerDialog.js'
import {OBJECT_PICKER_CREATED_EVENT} from '../../src/objectPicker.js'
import {GrampsjsViewNewPlace} from '../../src/views/GrampsjsViewNewPlace.js'

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

function makePicker(objectType, query) {
  const picker = new GrampsjsObjectPickerDialog()
  picker.objectType = objectType
  picker.appState = {
    i18n: {lang: 'en', strings: {}},
    permissions: {canAdd: true},
  }
  picker._query = query
  picker._close = vi.fn()
  Object.defineProperty(picker, 'renderRoot', {
    value: {getElementById: () => null},
  })
  return picker
}

describe('complete object creation from a picker', () => {
  it.each([
    ['place', 'Bern', '<grampsjs-view-new-place'],
    ['citation', 'p. 12', '<grampsjs-view-new-citation'],
  ])('opens the complete %s form', async (objectType, query, element) => {
    const picker = makePicker(objectType, query)

    await picker._handleAddObject(objectType)

    expect(picker._close).toHaveBeenCalledOnce()
    expect(picker._objectPickerRequest).toEqual({
      id: expect.any(String),
      objectType,
      query,
    })
    expect(templateMarkup(picker.render())).toContain(element)
  })

  it('selects the completed object and leaves persistence to the full form', () => {
    const picker = makePicker('place', 'Bern')
    picker._objectPickerRequestId = 'request-1'
    picker._createObjectType = 'place'
    let selected
    picker.addEventListener('select-object:selected', event => {
      selected = event.detail
    })

    picker._handleCreatedObject(
      new CustomEvent(OBJECT_PICKER_CREATED_EVENT, {
        detail: {
          requestId: 'request-1',
          objectType: 'place',
          objects: [
            {
              _class: 'Place',
              handle: 'place-handle',
              gramps_id: 'P0042',
              name: {_class: 'PlaceName', value: 'Bern'},
            },
          ],
        },
      })
    )

    expect(selected).toEqual({
      picker_id: expect.any(String),
      object_type: 'place',
      object: expect.objectContaining({
        handle: 'place-handle',
        name: {_class: 'PlaceName', value: 'Bern'},
      }),
      handle: 'place-handle',
    })
    expect(picker._createObjectType).toBe('')
  })

  it('does not leak the coordinate editor save into the originating form', () => {
    const placeView = new GrampsjsViewNewPlace()
    placeView.data = {
      _class: 'Place',
      name: {_class: 'PlaceName', value: 'Test place'},
    }
    placeView._latLongDialogOpen = true
    const coordinateEditor = document.createElement('div')
    placeView.append(coordinateEditor)
    coordinateEditor.addEventListener('object:save', event =>
      placeView._handleLatLongSave(event)
    )
    const leakedSave = vi.fn()
    placeView.addEventListener('object:save', leakedSave)

    coordinateEditor.dispatchEvent(
      new CustomEvent('object:save', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: {data: {lat: '46.948', long: '7.447'}},
      })
    )

    expect(leakedSave).not.toHaveBeenCalled()
    expect(placeView.data).toEqual({
      _class: 'Place',
      name: {_class: 'PlaceName', value: 'Test place'},
      lat: '46.948',
      long: '7.447',
    })
    expect(placeView._latLongDialogOpen).toBe(false)
  })
})
