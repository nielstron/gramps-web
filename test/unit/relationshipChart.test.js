import {Graphviz} from '@hpcc-js/wasm'
import {describe, expect, it} from 'vitest'
import {Relgraph, generateDot} from '../../src/charts/RelationshipChart.js'

const emptyParentFamily = {
  handle: '',
  father_handle: '',
  mother_handle: '',
}

function person(handle, families, primaryParentFamily = emptyParentFamily) {
  return {
    handle,
    gramps_id: handle,
    profile: {name_given: handle, name_surname: 'Test'},
    extended: {
      families,
      primary_parent_family: primaryParentFamily,
    },
  }
}

function graphWithThreePartners() {
  const family1 = {
    handle: 'F1',
    father_handle: 'P',
    mother_handle: 'S1',
    child_ref_list: [{ref: 'C1'}],
  }
  const family2 = {
    handle: 'F2',
    father_handle: 'P',
    mother_handle: 'S2',
    child_ref_list: [{ref: 'C2'}],
  }
  const family3 = {
    handle: 'F3',
    father_handle: 'P',
    mother_handle: 'S3',
    child_ref_list: [],
  }
  const data = [
    person('P', [family1, family2, family3]),
    person('S1', [family1]),
    person('S2', [family2]),
    person('S3', [family3]),
    person('C1', [], family1),
    person('C2', [], family2),
  ]
  return new Relgraph(data, 190, 90, 'P')
}

function graphWithPartnerNetworkAndSiblings() {
  const parentFamily = {
    handle: 'FP',
    father_handle: 'G1',
    mother_handle: 'G2',
  }
  const primaryFamily = {
    handle: 'FTS',
    father_handle: 'T',
    mother_handle: 'S',
  }
  const familyWith = (handle, father, mother) => ({
    handle,
    father_handle: father,
    mother_handle: mother,
  })
  const tC = familyWith('FTC', 'T', 'C')
  const tA = familyWith('FTA', 'T', 'A')
  const sR = familyWith('FSR', 'R', 'S')
  const data = [
    person('C', [tC]),
    person('N', [], primaryFamily),
    person('S', [primaryFamily, sR]),
    person('R', [sR]),
    person('H2', [], parentFamily),
    person('T', [primaryFamily, tC, tA], parentFamily),
    person('G1', [parentFamily]),
    person('G2', [parentFamily]),
    person('A', [tA]),
    person('H1', [], parentFamily),
  ]
  return new Relgraph(data, 190, 90, 'N')
}

function personXPositions(svg) {
  return [...svg.querySelectorAll('[class*="person_"]')]
    .map(node => ({
      handle: node.getAttribute('class').match(/person_(\S+)/)[1],
      x: Number(node.querySelector('text').getAttribute('x')),
      y: Number(node.querySelector('text').getAttribute('y')),
    }))
    .sort((a, b) => a.x - b.x)
}

describe('RelationshipChart', () => {
  it('emits one node per person and separate family junctions', () => {
    const dot = generateDot(graphWithThreePartners())

    expect(dot.match(/class="person_P"/g)).toHaveLength(1)
    expect(dot.match(/class="family_F[123]"/g)).toHaveLength(3)
    expect(dot.match(/class="couple"/g)).toHaveLength(6)
    expect(dot.match(/class="child"/g)).toHaveLength(2)
    expect(dot).not.toContain('fakeparent')
  })

  it('places family junctions between partners and children', async () => {
    const graphviz = await Graphviz.load()
    const svg = new DOMParser().parseFromString(
      graphviz.layout(generateDot(graphWithThreePartners()), 'svg', 'dot'),
      'image/svg+xml'
    )
    const y = (type, handle) =>
      Number(svg.querySelector(`.${type}_${handle} text`).getAttribute('y'))

    expect(svg.querySelectorAll('.person_P')).toHaveLength(1)
    expect(y('person', 'S1')).toBeCloseTo(y('person', 'P'))
    expect(y('person', 'S2')).toBeCloseTo(y('person', 'P'))
    expect(y('person', 'S3')).toBeCloseTo(y('person', 'P'))
    expect(y('family', 'F1')).toBeGreaterThan(y('person', 'P'))
    expect(y('person', 'C1')).toBeGreaterThan(y('family', 'F1'))
    expect(y('family', 'F2')).toBeGreaterThan(y('person', 'P'))
    expect(y('person', 'C2')).toBeGreaterThan(y('family', 'F2'))
  })

  it('keeps a connected partner network together instead of inserting siblings', async () => {
    const graphviz = await Graphviz.load()
    const svg = new DOMParser().parseFromString(
      graphviz.layout(
        generateDot(graphWithPartnerNetworkAndSiblings()),
        'svg',
        'dot'
      ),
      'image/svg+xml'
    )
    const sameGeneration = personXPositions(svg).filter(
      person => person.y === personXPositions(svg).find(p => p.handle === 'T').y
    )
    const partnerNetwork = new Set(['R', 'S', 'T', 'C', 'A'])
    const positions = sameGeneration
      .map((person, index) => (partnerNetwork.has(person.handle) ? index : -1))
      .filter(index => index >= 0)

    expect(Math.max(...positions) - Math.min(...positions) + 1).toBe(
      positions.length
    )
  })
})
