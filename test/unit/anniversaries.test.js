import {describe, expect, it, vi} from 'vitest'

import {participantHandles} from '../../src/anniversaries.js'
import {GrampsjsViewAnniversaries} from '../../src/views/GrampsjsViewAnniversaries.js'

function eventWithParticipants(people = [], families = []) {
  return {
    profile: {
      participants: {
        people: people.map(handle => ({person: {handle}})),
        families: families.map(([father, mother]) => ({
          family: {father: {handle: father}, mother: {handle: mother}},
        })),
      },
    },
  }
}

describe('anniversary relationship filtering', () => {
  it('collects and deduplicates direct and family participants', () => {
    const event = eventWithParticipants(['P1', 'P2'], [['P2', 'P3']])
    expect(participantHandles(event)).toEqual(['P1', 'P2', 'P3'])
  })

  it('keeps only events with a participant within the configured degree', async () => {
    const view = new GrampsjsViewAnniversaries()
    view.homePersonHandle = 'HOME'
    view.relationshipDegree = 2
    view.appState = {
      apiGet: vi.fn(url => {
        const handle = url.split('/').at(-2)
        return Promise.resolve({
          data: {
            connected: true,
            steps: Array(handle === 'NEAR' ? 2 : 3).fill({}),
          },
        })
      }),
    }
    const near = eventWithParticipants(['NEAR'])
    const far = eventWithParticipants([], [['FAR', undefined]])

    expect(await view._filterByRelationshipDegree([near, far])).toEqual([near])
  })

  it('counts a sibling as two parent-child degrees', async () => {
    const view = new GrampsjsViewAnniversaries()
    view.homePersonHandle = 'HOME'
    view.appState = {
      apiGet: vi.fn().mockResolvedValue({
        data: {
          connected: true,
          steps: [{relation: 'sibling'}],
        },
      }),
    }

    expect(await view._distanceTo('SIBLING')).toBe(2)
  })
})
