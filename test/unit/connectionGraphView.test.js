import {describe, expect, it, vi} from 'vitest'
import {
  connectionContextHandles,
  GrampsjsViewConnectionGraph,
} from '../../src/views/GrampsjsViewConnectionGraph.js'

const family = {
  handle: 'F1',
  father_handle: 'P1',
  mother_handle: 'P2',
  child_ref_list: [{ref: 'C1'}, {ref: 'C2'}],
}

describe('connection graph view', () => {
  it('adds the other parent around parent-child paths', () => {
    expect(
      connectionContextHandles(
        [
          {
            from_handle: 'P1',
            to_handle: 'C1',
            family_handle: 'F1',
            relation: 'child',
          },
        ],
        [family]
      )
    ).toEqual(['P2'])
  })

  it('adds both parents around sibling paths', () => {
    expect(
      connectionContextHandles(
        [
          {
            from_handle: 'C1',
            to_handle: 'C2',
            family_handle: 'F1',
            relation: 'sibling',
          },
        ],
        [family]
      )
    ).toEqual(['P1', 'P2'])
  })

  it('can hide the contextual relatives without changing the path', () => {
    const view = new GrampsjsViewConnectionGraph()
    view._path = {person_handles: ['P1', 'C1']}
    view._people = [{handle: 'P1'}, {handle: 'C1'}, {handle: 'P2'}]

    expect(view._visiblePeople).toHaveLength(3)
    view._handleCloseRelativesToggle({target: {selected: false}})
    expect(view._visiblePeople.map(person => person.handle)).toEqual([
      'P1',
      'C1',
    ])
  })

  it('fetches path families and their contextual people', async () => {
    const people = {
      I1: {handle: 'P1', gramps_id: 'I1', profile: {}},
      I2: {handle: 'C1', gramps_id: 'I2', profile: {}},
    }
    const apiGet = vi.fn(async url => {
      if (url.includes('gramps_id=I1')) return {data: [people.I1]}
      if (url.includes('gramps_id=I2')) return {data: [people.I2]}
      if (url === '/api/relations/P1/C1/path') {
        return {
          data: {
            connected: true,
            person_handles: ['P1', 'C1'],
            family_handles: ['F1'],
            steps: [
              {
                from_handle: 'P1',
                to_handle: 'C1',
                family_handle: 'F1',
                relation: 'child',
              },
            ],
          },
        }
      }
      if (url.startsWith('/api/families/?handles=F1')) return {data: [family]}
      if (url.startsWith('/api/people/?handles=P1,C1,P2')) {
        return {data: [people.I1, people.I2, {handle: 'P2', profile: {}}]}
      }
      throw new Error(`Unexpected URL: ${url}`)
    })
    const view = new GrampsjsViewConnectionGraph()
    view.appState = {apiGet, i18n: {lang: 'en'}}
    view.active = true
    view.grampsId = 'I1'
    view.targetGrampsId = 'I2'

    await view._fetchPath()

    expect(view._people.map(person => person.handle)).toEqual([
      'P1',
      'C1',
      'P2',
    ])
    expect(view._families).toEqual([family])
  })
})
