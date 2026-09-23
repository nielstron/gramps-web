import {describe, expect, it} from 'vitest'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'
import {GrampsjsPathConnectionChart} from '../../src/components/GrampsjsPathConnectionChart.js'

const person = handle => ({
  handle,
  gramps_id: handle,
  profile: {name_given: handle},
})
const family = {
  handle: 'family',
  father_handle: 'father',
  mother_handle: 'mother',
  type: 'Married',
  child_ref_list: [{ref: 'a'}, {ref: 'b'}],
}
async function layout(handles, steps, families = []) {
  const chart = new GrampsjsPathConnectionChart()
  chart.appState = {i18n: {lang: 'en', strings: {}}}
  chart.data = handles.map(person)
  chart._graph = new FamilyGraph(chart.data)
  chart.steps = steps
  chart.contextFamilies = families
  await chart._requestLayout(handles[0])
  return chart._layout
}
const positions = result =>
  Object.fromEntries(
    result.nodes.filter(n => n.kind === 'person').map(n => [n.handle, n])
  )

describe('connection graph generations and family structure', () => {
  it('places parents above children even without contextual relatives', async () => {
    const result = await layout(
      ['a', 'father'],
      [
        {
          from_handle: 'a',
          to_handle: 'father',
          relation: 'parent',
          family_handle: 'family',
        },
      ]
    )
    const nodes = positions(result)
    expect(nodes.father.y).toBeLessThan(nodes.a.y)
  })
  it('uses the compact API family data to preserve the siblings’ parents', async () => {
    const result = await layout(
      ['a', 'b', 'father', 'mother'],
      [
        {
          from_handle: 'a',
          to_handle: 'b',
          relation: 'sibling',
          family_handle: 'family',
        },
      ],
      [family]
    )
    const nodes = positions(result)
    expect(nodes.father.y).toBeLessThan(nodes.a.y)
    expect(nodes.mother.y).toBe(nodes.father.y)
    expect(nodes.a.y).toBe(nodes.b.y)
    expect(nodes.a.x).toBeLessThan(nodes.b.x)
    expect(result.nodes.filter(n => n.kind === 'family')).toHaveLength(1)
    expect(result.links.filter(l => l.kind !== 'connection')).toHaveLength(4)
  })
  it('keeps one person node when the connection passes through multiple marriages', async () => {
    const other = {
      ...family,
      handle: 'other',
      mother_handle: 'other-mother',
      child_ref_list: [{ref: 'c'}],
    }
    const result = await layout(
      ['a', 'father', 'c', 'mother', 'other-mother'],
      [
        {
          from_handle: 'a',
          to_handle: 'father',
          relation: 'parent',
          family_handle: 'family',
        },
        {
          from_handle: 'father',
          to_handle: 'c',
          relation: 'child',
          family_handle: 'other',
        },
      ],
      [family, other]
    )
    expect(result.nodes.filter(n => n.handle === 'father')).toHaveLength(1)
    const nodes = positions(result)
    expect(nodes.a.y).toBe(nodes.c.y)
    expect(nodes.father.y).toBeLessThan(nodes.c.y)
  })
  it('keeps path order for partners on the same generation', async () => {
    const result = await layout(
      ['a', 'b', 'c'],
      [
        {from_handle: 'a', to_handle: 'b', relation: 'partner'},
        {from_handle: 'b', to_handle: 'c', relation: 'partner'},
      ]
    )
    const nodes = positions(result)
    expect(nodes.a.y).toBe(nodes.b.y)
    expect(nodes.a.x).toBeLessThan(nodes.b.x)
    expect(nodes.b.x).toBeLessThan(nodes.c.x)
  })
  it.each([true, false])(
    'preserves a long descending path with context=%s',
    async context => {
      // The reported connection has 41 steps, including a partner in generation 4.
      const handles = Array.from({length: 42}, (_, i) => `p${i}`)
      const steps = handles.slice(1).map((handle, i) => ({
        from_handle: handles[i],
        to_handle: handle,
        relation: i === 4 ? 'partner' : 'child',
        family_handle: `f${i}`,
      }))
      const families = steps
        .filter(s => s.relation === 'child')
        .map((s, i) => ({
          handle: s.family_handle,
          father_handle: s.from_handle,
          mother_handle: `m${i}`,
          type: 'Married',
          child_ref_list: [{ref: s.to_handle}],
        }))
      const people = [
        ...handles,
        ...(context ? families.map(f => f.mother_handle) : []),
      ]
      // API result order must not determine graph order.
      const result = await layout(
        people.reverse(),
        steps,
        context ? families : []
      )
      const nodes = positions(result)
      expect(Object.keys(nodes)).toHaveLength(people.length)
      for (const step of steps) {
        const from = nodes[step.from_handle]
        const to = nodes[step.to_handle]
        if (step.relation === 'child') expect(from.y).toBeLessThan(to.y)
        else {
          expect(from.y).toBe(to.y)
          expect(from.x).toBeLessThan(to.x)
        }
      }
      if (context)
        for (const f of families) {
          expect(nodes[f.father_handle].y).toBe(nodes[f.mother_handle].y)
          expect(
            result.links.some(
              l =>
                l.source.key === `family:${f.handle}` &&
                l.target.handle === f.child_ref_list[0].ref
            )
          ).toBe(true)
        }
    }
  )
})
