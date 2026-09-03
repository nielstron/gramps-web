import {afterEach, describe, expect, it, vi} from 'vitest'

import {GrampsjsChildren} from '../../src/components/GrampsjsChildren.js'
import {GrampsjsFamily} from '../../src/components/GrampsjsFamily.js'
import {GrampsjsObjectPickerDialog} from '../../src/components/GrampsjsObjectPickerDialog.js'
import {GrampsjsFormPersonSlot} from '../../src/components/GrampsjsFormPersonSlot.js'
import {GrampsjsRelationships} from '../../src/components/GrampsjsRelationships.js'
import {GrampsjsName} from '../../src/components/GrampsjsName.js'
import {GrampsjsPerson} from '../../src/components/GrampsjsPerson.js'
import {GrampsjsTreeChartAddPerson} from '../../src/components/GrampsjsTreeChartAddPerson.js'
import {GrampsjsObjectForm} from '../../src/components/GrampsjsObjectForm.js'
import {
  OBJECT_PICKER_CREATED_EVENT,
  personNameFromQuery,
} from '../../src/objectPicker.js'
import {GrampsjsViewNewPerson} from '../../src/views/GrampsjsViewNewPerson.js'
import {GrampsjsViewNewObject} from '../../src/views/GrampsjsViewNewObject.js'

const appState = {
  i18n: {lang: 'en', strings: {}},
  permissions: {canAdd: true, canEdit: true},
}

class TestObjectForm extends GrampsjsObjectForm {
  firstUpdated() {}
}

class TestNewObject extends GrampsjsViewNewObject {}

if (!window.customElements.get('test-person-picker-object-form')) {
  window.customElements.define('test-person-picker-object-form', TestObjectForm)
}
if (!window.customElements.get('test-picker-new-object')) {
  window.customElements.define('test-picker-new-object', TestNewObject)
}

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

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

describe('unified person picker flow', () => {
  it('keeps recursive form-data changes inside their immediate owner', () => {
    const outer = document.createElement('test-picker-new-object')
    const inner = document.createElement('test-picker-new-object')
    outer._handleFormData = vi.fn()
    inner._handleFormData = vi.fn()
    outer.append(inner)
    document.body.append(outer)

    inner.dispatchEvent(
      new CustomEvent('formdata:changed', {
        bubbles: true,
        composed: true,
        detail: {data: ['inner-object']},
      })
    )

    expect(inner._handleFormData).toHaveBeenCalledOnce()
    expect(outer._handleFormData).not.toHaveBeenCalled()
  })

  it('closes the parent form while navigating to create a linked person', async () => {
    const form = document.createElement('test-person-picker-object-form')
    form.appState = appState
    document.body.append(form)
    await form.updateComplete
    const dialog = form.shadowRoot.querySelector('md-dialog')
    const close = vi.spyOn(dialog, 'close')

    dialog.dispatchEvent(
      new CustomEvent('nav', {
        bubbles: true,
        composed: true,
        detail: {path: 'new_person', preserveEdit: true},
      })
    )

    expect(close).toHaveBeenCalledOnce()
  })

  it('shows one add-or-link action for a family child list', () => {
    const children = new GrampsjsChildren()
    expect(children.hasShare).toBe(true)
    expect(children.hasAdd).toBe(false)
  })

  it('keeps child-list add-or-link visible outside edit mode', () => {
    const children = new GrampsjsChildren()
    children.appState = appState

    expect(templateMarkup(children.render())).toContain('<md-icon-button')
  })

  it('shows one add-or-link action for each empty family parent', () => {
    const family = new GrampsjsFamily()
    family.appState = appState
    family.data = {profile: {father: {}, mother: {}}}
    family.edit = true

    expect(
      templateMarkup(family._renderParent('father', 'Father')).match(
        /<md-icon-button/g
      )
    ).toHaveLength(1)
  })

  it('keeps the family-parent add-or-link action visible outside edit mode', () => {
    const family = new GrampsjsFamily()
    family.appState = appState
    family.data = {profile: {father: {}, mother: {}}}

    expect(
      templateMarkup(family._renderParent('father', 'Father')).match(
        /<md-icon-button/g
      )
    ).toHaveLength(1)
  })

  it('keeps add-relationship actions visible outside edit mode', () => {
    const relationships = new GrampsjsRelationships()
    relationships.appState = appState

    expect(
      templateMarkup(relationships.render()).match(/<md-outlined-button/g)
    ).toHaveLength(3)
  })

  it('shows one add-or-link action for each tree relationship', () => {
    const addPerson = new GrampsjsTreeChartAddPerson()
    addPerson.appState = appState

    expect(
      templateMarkup(addPerson._renderRelationRow('Father', 'father')).match(
        /<md-icon-button/g
      )
    ).toHaveLength(1)
  })

  it('offers sibling linking alongside the other tree relationships', () => {
    const addPerson = new GrampsjsTreeChartAddPerson()
    addPerson.appState = appState
    addPerson._personData = {extended: {primary_parent_family: {}}}

    expect(templateMarkup(addPerson._renderPickerDialog())).toContain('Sibling')
  })

  it('offers the family-member flow from the person profile', () => {
    const person = new GrampsjsPerson()
    person.appState = appState
    person.data = {profile: {}, gender: 2}

    const markup = templateMarkup(person.renderProfile())
    expect(markup).toContain('Add Family Member')
    expect(markup).toContain('<grampsjs-tree-chart-add-person')
  })

  it('shows a differing birth surname in the person profile heading', () => {
    const person = new GrampsjsPerson()
    person.appState = {
      ...appState,
      i18n: {lang: 'de', strings: {born: 'geb.'}},
    }
    person.data = {
      profile: {name_given: 'Anna', name_surname: 'Müller'},
      primary_name: {
        type: 'Married Name',
        surname_list: [{prefix: '', surname: 'Müller', connector: ''}],
      },
      alternate_names: [
        {
          type: 'Birth Name',
          surname_list: [{prefix: 'von', surname: 'Bern', connector: ''}],
        },
      ],
    }

    expect(templateMarkup(person._displayName())).toContain(
      'Anna Müller (geb. von Bern)'
    )
  })

  it('shows a right-side profile picture or an upload placeholder', () => {
    const person = new GrampsjsPerson()
    person.appState = appState
    person.data = {
      profile: {},
      gender: 2,
      media_list: [],
      extended: {media: []},
    }

    const placeholder = templateMarkup(person.renderPicture())
    expect(placeholder).toContain('profile-picture-placeholder')
    expect(placeholder).toContain('Add profile picture')

    person._handleAddProfilePictureClick()
    expect(templateMarkup(person.dialogContent)).toContain(
      '<grampsjs-form-new-media'
    )

    person.data = {
      ...person.data,
      media_list: [{ref: 'media-handle'}],
      extended: {
        media: [
          {
            handle: 'media-handle',
            gramps_id: 'O0001',
            mime: 'image/jpeg',
            checksum: 'checksum',
          },
        ],
      },
    }
    const portrait = templateMarkup(person.renderPicture())
    expect(portrait).toContain('profile-picture')
    expect(portrait).toContain('media-handle')
    expect(portrait).toContain('Add profile picture')
    expect(portrait).not.toContain('profile-picture-placeholder')
  })

  it('makes a newly uploaded portrait the first gallery image', async () => {
    const person = new GrampsjsPerson()
    person.appState = appState
    person.data = {media_list: [{ref: 'old-media'}]}
    const upload = vi.fn().mockResolvedValue({
      data: {handle: 'new-media'},
    })
    Object.defineProperty(person, 'renderRoot', {
      value: {
        querySelector: () => ({upload}),
      },
    })
    let editAction
    person.addEventListener('edit:action', e => {
      editAction = e.detail
    })

    await person._handleNewProfilePictureSave({
      detail: {data: {desc: 'Portrait'}},
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    })

    expect(upload).toHaveBeenCalledWith({desc: 'Portrait'})
    expect(editAction).toEqual({
      action: 'updateProp',
      data: {
        media_list: [{ref: 'new-media'}, {ref: 'old-media'}],
      },
    })
  })

  it('uses the same searchable picker in new-family person slots', () => {
    const slot = new GrampsjsFormPersonSlot()
    slot.appState = appState
    const markup = templateMarkup(slot.render())

    expect(markup).toContain('<grampsjs-form-select-object-list')
    expect(markup).not.toContain('<grampsjs-pill-toggle')
  })

  it('numbers names and marks the first one as preferred', () => {
    const first = new GrampsjsName()
    first.appState = appState
    first.data = {_class: 'Name', type: 'Birth Name', surname_list: []}
    first.index = 1
    first.preferred = true
    const second = new GrampsjsName()
    second.appState = appState
    second.data = {_class: 'Name', type: 'Married Name', surname_list: []}
    second.index = 2

    expect(templateMarkup(first.render())).toContain('1.')
    expect(templateMarkup(first.render())).toContain('Preferred')
    expect(templateMarkup(second.render())).toContain('2.')
    expect(templateMarkup(second.render())).not.toContain('Preferred')
  })

  it.each([
    ['person', 'new_person'],
    ['family', 'new_family'],
    ['event', 'new_event'],
    ['place', 'new_place'],
    ['source', 'new_source'],
    ['citation', 'new_citation'],
    ['repository', 'new_repository'],
    ['note', 'new_note'],
    ['media', 'new_media'],
  ])('opens the complete new-%s form from the picker', async objectType => {
    const picker = new GrampsjsObjectPickerDialog()
    picker.objectType = objectType
    picker.appState = appState
    picker._query = 'stale debounced value'
    const textField = document.createElement('input')
    textField.id = 'textfield'
    textField.value = 'Ada Lovelace'
    const renderRoot = {getElementById: () => textField}
    Object.defineProperty(picker, 'renderRoot', {value: renderRoot})
    picker._close = vi.fn()
    await picker._handleAddObject(objectType)

    expect(picker._close).toHaveBeenCalled()
    expect(picker._createObjectType).toBe(objectType)
    expect(picker._objectPickerRequest).toEqual({
      id: expect.any(String),
      objectType,
      query: 'Ada Lovelace',
    })
  })

  it.each([
    ['Ada Lovelace', 'Ada', 'Lovelace'],
    ['Lovelace, Ada', 'Ada', 'Lovelace'],
    ['  Ada   Byron Lovelace  ', 'Ada Byron', 'Lovelace'],
    ['Ada', 'Ada', undefined],
  ])('parses %j into given and surname fields', (query, given, surname) => {
    const name = personNameFromQuery(query)
    expect(name.first_name).toBe(given)
    expect(name.surname_list?.[0].surname).toBe(surname)
  })

  it('prefills the full new-person form from the generic picker request', () => {
    const state = {
      objectPickerRequest: {
        id: 'request-1',
        objectType: 'person',
        query: 'Ada Lovelace',
      },
    }
    const view = new GrampsjsViewNewPerson()
    view.objectPickerRequest = state.objectPickerRequest

    view._applyObjectPickerRequest()

    expect(view.data.primary_name).toEqual(personNameFromQuery('Ada Lovelace'))
    expect(view._objectPickerRequest).toEqual(state.objectPickerRequest)
  })

  it('returns a created object only to the originating picker', () => {
    const picker = new GrampsjsObjectPickerDialog()
    picker._objectPickerRequestId = 'request-1'
    let selected
    picker.addEventListener('select-object:selected', event => {
      selected = event.detail
    })
    picker._handleCreatedObject(
      new CustomEvent(OBJECT_PICKER_CREATED_EVENT, {
        detail: {
          requestId: 'request-1',
          objectType: 'source',
          objects: [{handle: 'source-1', gramps_id: 'S0001'}],
        },
      })
    )

    expect(selected).toEqual({
      picker_id: expect.any(String),
      object_type: 'source',
      object: {handle: 'source-1', gramps_id: 'S0001'},
      handle: 'source-1',
    })
  })

  it('isolates nested picker completions by request ID', () => {
    const outer = new GrampsjsObjectPickerDialog()
    const inner = new GrampsjsObjectPickerDialog()
    outer._objectPickerRequestId = 'outer-request'
    inner._objectPickerRequestId = 'inner-request'
    const outerSelected = vi.fn()
    const innerSelected = vi.fn()
    outer.addEventListener('select-object:selected', outerSelected)
    inner.addEventListener('select-object:selected', innerSelected)
    const event = new CustomEvent(OBJECT_PICKER_CREATED_EVENT, {
      detail: {
        requestId: 'inner-request',
        objectType: 'place',
        objects: [{handle: 'place-1'}],
      },
    })

    outer._handleCreatedObject(event)
    inner._handleCreatedObject(event)

    expect(outerSelected).not.toHaveBeenCalled()
    expect(innerSelected).toHaveBeenCalledOnce()
  })

  it('returns a complete newly created object without leaving its parent form', async () => {
    const view = new GrampsjsViewNewPerson()
    view.appState = {
      ...appState,
      apiGet: vi.fn().mockResolvedValue({
        data: {handle: 'person-1', gramps_id: 'I0001', profile: {}},
      }),
    }
    view._objectPickerRequest = {
      id: 'request-1',
      objectType: 'person',
      query: 'Ada Lovelace',
    }
    view._reset = vi.fn()
    const back = vi.spyOn(window.history, 'back')
    let completion
    window.addEventListener(
      OBJECT_PICKER_CREATED_EVENT,
      event => {
        completion = event.detail
      },
      {once: true}
    )

    await view._handleCreatedObjects([{handle: 'person-1', gramps_id: 'I0001'}])

    expect(completion).toEqual({
      requestId: 'request-1',
      objectType: 'person',
      objects: [{handle: 'person-1', gramps_id: 'I0001', profile: {}}],
    })
    expect(back).not.toHaveBeenCalled()
    expect(view._reset).toHaveBeenCalledOnce()
  })
})
