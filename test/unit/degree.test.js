import {describe, expect, it} from 'vitest'
import {
  degreeFromEvent,
  eventTitleAttributeType,
  eventTitleFromEvent,
  isAcademicEvent,
  isTitleEvent,
  withEventTitleAttribute,
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

  it('treats coronations as title-bearing events', () => {
    const event = {
      type: {string: 'Coronation'},
      attribute_list: [{type: 'Title', value: 'Kaiser'}],
    }
    expect(isTitleEvent(event)).to.equal(true)
    expect(eventTitleAttributeType(event)).to.equal('Title')
    expect(eventTitleFromEvent(event)).to.equal('Kaiser')
  })

  it('updates only the title attribute appropriate to the event type', () => {
    const event = {
      type: 'Coronation',
      attribute_list: [
        {_class: 'Attribute', type: 'Place in succession', value: '2'},
        {_class: 'Attribute', type: 'Title', value: 'König'},
      ],
    }
    expect(
      withEventTitleAttribute(event, ' Kaiser ').attribute_list
    ).to.deep.equal([
      {_class: 'Attribute', type: 'Place in succession', value: '2'},
      {_class: 'Attribute', type: 'Title', value: 'Kaiser'},
    ])
  })
})
