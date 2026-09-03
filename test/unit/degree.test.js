import {describe, expect, it} from 'vitest'
import {
  degreeFromEvent,
  isAcademicEvent,
  withDegreeAttribute,
} from '../../src/degree.js'

describe('degree event helpers', () => {
  it('recognizes degree and graduation events', () => {
    expect(isAcademicEvent({type: 'Degree'})).to.equal(true)
    expect(isAcademicEvent({type: {string: 'Graduation'}})).to.equal(true)
    expect(isAcademicEvent({type: 'Education'})).to.equal(false)
  })

  it('reads the canonical Degree attribute', () => {
    expect(
      degreeFromEvent({attribute_list: [{type: 'Degree', value: 'Dr.'}]})
    ).to.equal('Dr.')
  })

  it('updates only the Degree attribute', () => {
    const event = {
      type: 'Degree',
      attribute_list: [
        {_class: 'Attribute', type: 'School', value: 'Heidelberg'},
        {_class: 'Attribute', type: 'Degree', value: 'MSc'},
      ],
    }
    expect(withDegreeAttribute(event, ' Dr. ').attribute_list).to.deep.equal([
      {_class: 'Attribute', type: 'School', value: 'Heidelberg'},
      {_class: 'Attribute', type: 'Degree', value: 'Dr.'},
    ])
  })

  it('removes an empty Degree attribute', () => {
    const event = {
      attribute_list: [{_class: 'Attribute', type: 'Degree', value: 'Dr.'}],
    }
    expect(withDegreeAttribute(event, '  ').attribute_list).to.deep.equal([])
  })
})
