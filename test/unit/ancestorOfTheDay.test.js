import {afterEach, describe, expect, it, vi} from 'vitest'
import {GrampsjsAncestorOfTheDay} from '../../src/components/GrampsjsAncestorOfTheDay.js'
import {treeUpdateSummary} from '../../src/treeUpdateSummary.js'

afterEach(() => vi.useRealTimers())

describe('ancestor of the day', () => {
  it('uses the local date and switches once at midnight without polling', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 23, 23, 59, 59))
    const card = new GrampsjsAncestorOfTheDay()
    card.homePersonHandle = 'home'
    card.appState = {i18n: {lang: 'de'}}
    card._checkDay()
    expect(card.getUrl()).toBe(
      '/api/views/ancestor-of-the-day/home?date=2026-09-23&locale=de'
    )
    vi.advanceTimersByTime(1100)
    expect(card.getUrl()).toBe(
      '/api/views/ancestor-of-the-day/home?date=2026-09-24&locale=de'
    )
    expect(vi.getTimerCount()).toBe(1)
    clearTimeout(card._midnightTimer)
  })

  it('does not request an ancestor before the home person is available', () => {
    expect(new GrampsjsAncestorOfTheDay().getUrl()).toBe('')
  })
})

describe('change summaries', () => {
  it('summarizes additions, updates, and deletions with plural object names', () => {
    expect(
      treeUpdateSummary([
        {type: 'Person', action: 0, count: 1},
        {type: 'Event', action: 1, count: 2},
        {type: 'Note', action: 2, count: 1},
      ])
    ).toBe('Added: 1 Person · Updated: 2 Events · Deleted: 1 Note')
  })

  it('has a translated fallback for changes without visible details', () => {
    expect(treeUpdateSummary([], () => 'Stammbaum geändert.')).toBe(
      'Stammbaum geändert.'
    )
  })
})
