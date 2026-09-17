import {afterEach, describe, expect, it, vi} from 'vitest'

import {GrampsjsViewRecentlyChanged} from '../../src/views/GrampsjsViewRecentlyChanged.js'

describe('recent changes dashboard view', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uses the compact SQL-backed view endpoint', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_800_123_456_000)
    const view = new GrampsjsViewRecentlyChanged()

    expect(view.getUrl()).toBe(
      '/api/views/recent-changes?since=1768564000&limit=8'
    )
  })
})
