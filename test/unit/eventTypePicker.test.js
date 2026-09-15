import {describe, expect, it} from 'vitest'
import '../../src/components/GrampsjsFormSelectType.js'

describe('event type picker', () => {
  it('omits Number of Marriages in either language without removing attributes', () => {
    const picker = document.createElement('grampsjs-form-select-type')
    picker.typeName = 'event_types'
    picker.types = {default: {event_types: ['Birth', 'Number of Marriages']}}
    picker.typesLocale = {
      default: {event_types: ['Geburt', 'Anzahl der Eheschließungen']},
    }
    expect(picker.getTypes()).toEqual(['Birth'])
    expect(picker.getTypes(false)).toEqual(['Geburt'])
    picker.typeName = 'person_attribute_types'
    picker.types = {default: {person_attribute_types: ['Number of Marriages']}}
    expect(picker.getTypes()).toEqual(['Number of Marriages'])
  })
})
