import {describe, expect, it} from 'vitest'

import {
  mapUrlFromState,
  parseMapUrlState,
  parseTimelineUrlState,
  timelineUrlFromState,
} from '../../src/viewUrlState.js'

describe('map URL state', () => {
  it('does not mistake missing numeric parameters for zero', () => {
    expect(parseMapUrlState('')).toMatchObject({
      latitude: null,
      longitude: null,
      zoom: null,
      year: null,
      yearSpan: null,
    })
  })

  it('round-trips the navigable map configuration', () => {
    const url = mapUrlFromState('https://example.test/map?unrelated=keep', {
      latitude: 48.398,
      longitude: 9.992,
      zoom: 8.25,
      year: 1859,
      yearSpan: 12,
      style: 'ohm',
      person: 'I1234',
      personScope: 'ancestors',
      routeVisible: false,
      hiddenOverlays: ['overlay-a', 'overlay-b'],
      eventHandles: ['event-a', 'event-b'],
    })

    expect(url.searchParams.get('unrelated')).toBe('keep')
    expect(parseMapUrlState(url.search)).toEqual({
      latitude: 48.398,
      longitude: 9.992,
      zoom: 8.25,
      year: 1859,
      yearSpan: 12,
      style: 'ohm',
      person: 'I1234',
      place: null,
      personScope: 'ancestors',
      routeVisible: false,
      hiddenOverlays: ['overlay-a', 'overlay-b'],
      eventHandles: ['event-a', 'event-b'],
    })
  })
})

describe('timeline URL state', () => {
  it('rounds sub-day rendering drift to the intended calendar date', () => {
    const intendedEnd = new Date(2030, 11, 31)
    const url = timelineUrlFromState('https://example.test/timeline', {
      start: new Date(1900, 0, 1),
      end: new Date(intendedEnd.getTime() - 1),
    })

    expect(url.searchParams.get('to')).toBe('2030-12-31')
  })

  it('round-trips the visible interval and filters', () => {
    const url = timelineUrlFromState('https://example.test/timeline', {
      start: new Date(1859, 0, 2),
      end: new Date(1920, 10, 3),
      eventType: 'Marriage',
      person: 'I1234',
      personScope: 'descendants',
      selectedEvent: 'E42',
    })

    const state = parseTimelineUrlState(url.search)
    expect(state.start).toEqual(new Date(1859, 0, 2))
    expect(state.end).toEqual(new Date(1920, 10, 3))
    expect(state).toMatchObject({
      eventType: 'Marriage',
      person: 'I1234',
      place: null,
      personScope: 'descendants',
      placeScope: 'exact',
      selectedEvent: 'E42',
    })
  })
})
