import {describe, expect, it} from 'vitest'

import {
  filterEventsByType,
  GrampsjsViewTimeline,
} from '../../src/views/GrampsjsViewTimeline.js'

const events = [
  {handle: 'e1', eventType: 'Birth'},
  {handle: 'e2', eventType: 'Marriage'},
  {handle: 'e3', eventType: 'Birth'},
]

describe('timeline event type filter', () => {
  it('keeps all events when no type is selected', () => {
    expect(filterEventsByType(events, '')).toEqual(events)
  })

  it('keeps only events matching the selected type', () => {
    expect(
      filterEventsByType(events, 'Birth').map(event => event.handle)
    ).toEqual(['e1', 'e3'])
  })

  it('combines the event type and person filters', () => {
    const view = new GrampsjsViewTimeline()
    view._data = events
    view._eventTypeFilter = 'Birth'
    view._activeFilter = {
      object_type: 'person',
      object: {event_ref_list: [{ref: 'e1'}, {ref: 'e2'}]},
    }

    expect(view._filteredData.map(event => event.handle)).toEqual(['e1'])
  })

  it('maps the all-types option back to an empty filter', () => {
    const view = new GrampsjsViewTimeline()
    view._eventTypeFilter = 'Birth'
    view._resetClickedState = () => {}

    view._handleEventTypeFilterChange({target: {value: '__all__'}})

    expect(view._eventTypeFilter).toBe('')
  })
})
