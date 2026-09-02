import {describe, expect, it} from 'vitest'

import {GrampsjsSourceCitations} from '../../src/components/GrampsjsSourceCitations.js'

describe('source citation creation', () => {
  it('prefills a new citation with the current source', () => {
    const citations = new GrampsjsSourceCitations()
    citations.source = {
      _class: 'Source',
      handle: 'source-handle',
      gramps_id: 'S0042',
      title: 'Civil register',
    }

    expect(citations._newCitationData()).toEqual({
      _class: 'Citation',
      confidence: 2,
      source_handle: 'source-handle',
    })
  })
})
