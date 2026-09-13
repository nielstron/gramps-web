import {describe, expect, it, vi} from 'vitest'
import {GrampsjsFormFamilyChildRef} from '../../src/components/GrampsjsFormFamilyChildRef.js'

describe('create a child inside the family picker', () => {
  it('ignores nested person-form picker resets after selecting the created child', () => {
    const form = new GrampsjsFormFamilyChildRef()
    form.data = {familyHandle: 'family', frel: 'Birth', mrel: 'Birth'}
    form._handleFormData({
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      composedPath: () => [{id: 'child-select-list'}, form],
      detail: {data: ['new-child']},
    })
    expect(form.isValid).toBe(true)
    form._handleFormData({
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      composedPath: () => [
        {id: 'person-select-list'},
        {localName: 'grampsjs-object-picker-dialog'},
        form,
      ],
      detail: {data: []},
    })
    expect(form.data.ref).toBe('new-child')
    expect(form.isValid).toBe(true)
  })
})
