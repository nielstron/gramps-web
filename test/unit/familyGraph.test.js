import {describe, it, expect} from 'vitest'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'

const childRef = (ref, frel = 'Birth', mrel = 'Birth') => ({ref, frel, mrel})

const family = (handle, father, mother, children = []) => ({
  handle,
  father_handle: father,
  mother_handle: mother,
  child_ref_list: children,
})

// R is the father in f1 and the mother in f2, and appears in f3 without
// being a parent there. S has no extended data.
const fParents = family('fP', 'F', '', [childRef('R')])
const f1 = family('f1', 'R', 'S', [
  childRef('A'),
  childRef('B', 'Adopted', 'Birth'),
])
const f2 = family('f2', 'T', 'R', [childRef('C', 'Birth', 'Foster')])
const f3 = family('f3', 'Q', 'Z', [childRef('Y')])
const R = {
  handle: 'R',
  gramps_id: 'I1',
  extended: {primary_parent_family: fParents, families: [f1, f2, f3]},
}
const S = {handle: 'S', gramps_id: 'I2'}
const graph = new FamilyGraph([R, S])

describe('FamilyGraph', () => {
  it('looks up people by handle and Gramps ID', () => {
    expect(graph.person('R')).toBe(R)
    expect(graph.personByGrampsId('I2')).toBe(S)
    expect(graph.person('X')).toBeUndefined()
    expect(graph.personByGrampsId('I9')).toBeUndefined()
  })

  it('keeps the first person for a duplicate Gramps ID', () => {
    const duplicates = new FamilyGraph([
      {handle: 'a', gramps_id: 'I1'},
      {handle: 'b', gramps_id: 'I1'},
    ])
    expect(duplicates.personByGrampsId('I1').handle).toBe('a')
  })

  it('returns parents with an empty string for unknown ones', () => {
    expect(graph.parents('R')).toEqual({father: 'F', mother: ''})
    expect(graph.parents('S')).toEqual({father: '', mother: ''})
    expect(graph.parents('X')).toEqual({father: '', mother: ''})
  })

  it('returns children across the families where the person is a parent', () => {
    expect(graph.children('R')).toEqual(['A', 'B', 'C'])
  })

  it('filters birth children by the relation to this parent', () => {
    expect(graph.children('R', {birthOnly: true})).toEqual(['A'])
  })

  it('returns a child only once when it belongs to multiple parent families', () => {
    const firstFamily = family('first', 'P', 'A', [childRef('C')])
    const secondFamily = family('second', 'P', 'B', [childRef('C')])
    const parent = {
      handle: 'P',
      gramps_id: 'IP',
      extended: {families: [firstFamily, secondFamily]},
    }
    const duplicateChildGraph = new FamilyGraph([parent])

    expect(duplicateChildGraph.children('P')).toEqual(['C'])
    expect(duplicateChildGraph.children('P', {birthOnly: true})).toEqual(['C'])
  })

  it('returns no children for a person without families', () => {
    expect(graph.children('S')).toEqual([])
    expect(graph.children('X')).toEqual([])
  })
})
