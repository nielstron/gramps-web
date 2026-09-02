import {describe, expect, it} from 'vitest'
import {Graphviz} from '@hpcc-js/wasm'
import {Relgraph, generateDot} from '../../src/charts/RelationshipChart.js'

const emptyParentFamily = {
  handle: '',
  father_handle: '',
  mother_handle: '',
}

function person(handle, families) {
  return {
    handle,
    gramps_id: handle,
    profile: {name_given: handle, name_surname: 'Test'},
    extended: {
      families,
      primary_parent_family: emptyParentFamily,
    },
  }
}

describe('RelationshipChart', () => {
  it('renders a person once and links later partnerships vertically', () => {
    const firstFamily = {
      handle: 'F1',
      father_handle: 'P',
      mother_handle: 'S1',
      child_ref_list: [],
    }
    const secondFamily = {
      handle: 'F2',
      father_handle: 'P',
      mother_handle: 'S2',
      child_ref_list: [],
    }
    const thirdFamily = {
      handle: 'F3',
      father_handle: 'P',
      mother_handle: 'S3',
      child_ref_list: [],
    }
    const data = [
      person('P', [firstFamily, secondFamily, thirdFamily]),
      person('S1', [firstFamily]),
      person('S2', [secondFamily]),
      person('S3', [thirdFamily]),
    ]

    const graph = new Relgraph(data, 190, 90, 'P')
    const dot = generateDot(graph)

    expect(dot.match(/class="person_P"/g)).toHaveLength(1)
    expect(dot.match(/class="personlink_P"\n\s+group=/g)).toHaveLength(2)
    expect(dot).toContain('"node_F1xP" -> "node_F2xP" [class="personlink_P"')
    expect(dot).toContain('"node_F2xP" -> "node_F3xP" [class="personlink_P"')
    expect(dot).not.toContain('fakeparent')
  })

  it('aligns a partnership continuation vertically with the person', async () => {
    const firstFamily = {
      handle: 'F1',
      father_handle: 'P',
      mother_handle: 'S1',
      child_ref_list: [],
    }
    const secondFamily = {
      handle: 'F2',
      father_handle: 'P',
      mother_handle: 'S2',
      child_ref_list: [],
    }
    const data = [
      person('P', [firstFamily, secondFamily]),
      person('S1', [firstFamily]),
      person('S2', [secondFamily]),
    ]
    const dot = generateDot(new Relgraph(data, 190, 90, 'P'))
    const graphviz = await Graphviz.load()
    const svg = new DOMParser().parseFromString(
      graphviz.layout(dot, 'svg', 'dot'),
      'image/svg+xml'
    )
    const personNode = svg.querySelector('.person_P text')
    const continuationNode = svg.querySelector('.personlink_P text')

    expect(personNode).not.toBeNull()
    expect(continuationNode).not.toBeNull()
    expect(
      Math.abs(
        Number(continuationNode.getAttribute('x')) -
          Number(personNode.getAttribute('x'))
      )
    ).toBeLessThan(1)
    expect(Number(continuationNode.getAttribute('y'))).not.toBeCloseTo(
      Number(personNode.getAttribute('y'))
    )
  })
})
