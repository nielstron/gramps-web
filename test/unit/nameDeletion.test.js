import {describe, expect, it} from 'vitest'

import {GrampsjsViewObject} from '../../src/views/GrampsjsViewObject.js'

class TestViewObject extends GrampsjsViewObject {
  _updateObject(obj, objType, update) {
    expect(objType).toBe('person')
    return update(structuredClone(obj))
  }
}

if (!window.customElements.get('test-name-deletion-view')) {
  window.customElements.define('test-name-deletion-view', TestViewObject)
}

describe('person name deletion', () => {
  it('promotes the first alternate name when deleting the preferred name', () => {
    const view = document.createElement('test-name-deletion-view')
    const person = {
      primary_name: {
        _class: 'Name',
        type: 'Married Name',
        first_name: 'Anneliese',
        surname_list: [{surname: 'Mündler-Schlatter'}],
      },
      alternate_names: [
        {
          _class: 'Name',
          type: 'Birth Name',
          first_name: 'Anneliese',
          surname_list: [{surname: 'Schlatter'}],
        },
        {
          _class: 'Name',
          type: 'Also Known As',
          first_name: 'Anneliese',
          surname_list: [{surname: 'Mündler'}],
        },
      ],
    }

    const updated = view.delName({index: 0}, person)

    expect(updated.primary_name).toEqual(person.alternate_names[0])
    expect(updated.alternate_names).toEqual([person.alternate_names[1]])
  })
})
