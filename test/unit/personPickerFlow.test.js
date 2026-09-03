import {afterEach, describe, expect, it, vi} from 'vitest'

import {GrampsjsChildren} from '../../src/components/GrampsjsChildren.js'
import {GrampsjsFamily} from '../../src/components/GrampsjsFamily.js'
import {GrampsjsObjectPickerDialog} from '../../src/components/GrampsjsObjectPickerDialog.js'
import {GrampsjsFormPersonSlot} from '../../src/components/GrampsjsFormPersonSlot.js'
import {GrampsjsRelationships} from '../../src/components/GrampsjsRelationships.js'
import {GrampsjsName} from '../../src/components/GrampsjsName.js'
import {GrampsjsPerson} from '../../src/components/GrampsjsPerson.js'
import {GrampsjsTreeChartAddPerson} from '../../src/components/GrampsjsTreeChartAddPerson.js'
import {
  PERSON_PICKER_CREATED_EVENT,
  personNameFromQuery,
} from '../../src/personPicker.js'
import {GrampsjsViewNewPerson} from '../../src/views/GrampsjsViewNewPerson.js'

const appState = {
  i18n: {lang: 'en', strings: {}},
  permissions: {canAdd: true, canEdit: true},
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

  it('opens the new-person page with a parsed search query', () => {
    const picker = new GrampsjsObjectPickerDialog()
    picker.objectType = 'person'
    picker.appState = appState
    picker._query = 'stale debounced value'
    const textField = document.createElement('input')
    textField.id = 'textfield'
    textField.value = 'Ada Lovelace'
    const renderRoot = {getElementById: () => textField}
    Object.defineProperty(picker, 'renderRoot', {value: renderRoot})
    picker._close = vi.fn()
    let navigation
    picker.addEventListener('nav', event => {
      navigation = event.detail
    })

    picker._handleAddPerson()

    expect(picker._close).toHaveBeenCalled()
    expect(navigation).toMatchObject({
      path: 'new_person',
      preserveEdit: true,
      state: {
        newPersonName: {
          _class: 'Name',
          first_name: 'Ada',
          surname_list: [{_class: 'Surname', surname: 'Lovelace'}],
        },
      },
    })
    expect(navigation.state.personPickerRequestId).toEqual(expect.any(String))
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

  it('prefills the full new-person form from navigation state', () => {
    const state = {
      personPickerRequestId: 'request-1',
      newPersonName: personNameFromQuery('Ada Lovelace'),
    }
    window.history.replaceState(state, '')
    const view = new GrampsjsViewNewPerson()

    view._applyNavigationPrefill()

    expect(view.data.primary_name).toEqual(state.newPersonName)
    expect(view._personPickerRequestId).toBe('request-1')
  })

  it('returns the created person to the originating picker', () => {
    const picker = new GrampsjsObjectPickerDialog()
    picker._personPickerRequestId = 'request-1'
    let selected
    picker.addEventListener('select-object:selected', event => {
      selected = event.detail
    })
    picker._handleCreatedPerson(
      new CustomEvent(PERSON_PICKER_CREATED_EVENT, {
        detail: {
          requestId: 'request-1',
          object: {handle: 'person-1', gramps_id: 'I0001'},
        },
      })
    )

    expect(selected).toEqual({
      object_type: 'person',
      object: {handle: 'person-1', gramps_id: 'I0001'},
      handle: 'person-1',
    })
  })
})
