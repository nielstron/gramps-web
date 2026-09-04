import {describe, expect, it} from 'vitest'

import {GrampsjsEvents} from '../../src/components/GrampsjsEvents.js'
import {GrampsjsPerson} from '../../src/components/GrampsjsPerson.js'
import {sortEventsByDate} from '../../src/util/reorder.js'

const event = (handle, type, sortval) => ({
  handle,
  type,
  ...(sortval === undefined ? {} : {date: {sortval}}),
})

describe('person timeline defaults and ordering', () => {
  it('shows family events by default', () => {
    const person = new GrampsjsPerson()

    expect(person._showFamilyEvents).toBe(true)
  })

  it('keeps undated life events before death and post-death events after it', () => {
    const events = [
      event('birth', 'Birth', 100),
      event('death', 'Death', 500),
      event('occupation', 'Occupation'),
      event('burial', 'Burial'),
      event('degree', 'Degree'),
    ]

    expect(sortEventsByDate(events).map(item => item.handle)).toEqual([
      'birth',
      'degree',
      'occupation',
      'death',
      'burial',
    ])
  })

  it('uses explicit dates instead of inferred life phases', () => {
    const events = [
      event('degree', 'Degree', 500),
      event('occupation', 'Occupation', 400),
      event('death', 'Death', 600),
    ]

    expect(sortEventsByDate(events).map(item => item.handle)).toEqual([
      'occupation',
      'degree',
      'death',
    ])
  })

  it('preserves parent, family, and child events in timeline order', () => {
    const events = [
      event('parent-birth', 'Birth'),
      event('birth', 'Birth', 100),
      event('family', 'Marriage'),
      event('child-birth', 'Birth'),
      event('death', 'Death', 500),
    ]
    const component = {
      preserveOrder: true,
      sorted: false,
      eventRef: [],
    }

    expect(GrampsjsEvents.prototype.sortData.call(component, events)).toEqual(
      events
    )
  })
})
