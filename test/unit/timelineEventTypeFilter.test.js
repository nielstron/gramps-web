import {describe, expect, it, vi} from 'vitest'

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

  it('keeps a URL-restored event selected without overriding its domain', async () => {
    const view = new GrampsjsViewTimeline()
    view._data = [{handle: 'e1', jsDate: new Date(1995, 0, 27)}]
    view._pendingHandle = 'e1'
    view._timelineDomain = [new Date(1900, 0, 1), new Date(2030, 11, 31)]
    Object.defineProperty(view, 'updateComplete', {
      value: Promise.resolve(true),
    })
    const scrollToDate = vi.fn(() => true)
    view._timelineEl = () => ({scrollToDate})

    await view._applyPendingHandle()

    expect(view._timelineUrlState().selectedEvent).toBe('e1')
    expect(scrollToDate).not.toHaveBeenCalled()
  })

  it('ignores an unchanged chart domain instead of starting a render loop', async () => {
    const view = new GrampsjsViewTimeline()
    const domain = [new Date(1900, 0, 1), new Date(2030, 11, 31)]
    view._timelineDomain = domain
    view._scheduleTimelineUrlUpdate = vi.fn()
    view._timelineEl = () => ({updateDetails: vi.fn()})

    await view._handleZoomEnd({
      detail: {
        handles: [],
        innerWidth: 800,
        domain: domain.map(date => new Date(date)),
      },
    })

    expect(view._timelineDomain).toBe(domain)
    expect(view._scheduleTimelineUrlUpdate).not.toHaveBeenCalled()
  })
})
