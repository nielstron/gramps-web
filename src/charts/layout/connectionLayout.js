import {Graphviz} from '@hpcc-js/wasm'
import {relationshipLayoutDefaults} from './relationshipLayout.js'

// Connection paths have one card per person. Their parent/child steps define
// generations even when the optional family context is hidden.
export function connectionModel(people, rootHandle, steps, families) {
  const byHandle = new Map(people.map(person => [person.handle, person]))
  const familiesByHandle = new Map(
    families.map(family => [family.handle, family])
  )
  const path = [
    steps[0]?.from_handle ?? rootHandle,
    ...steps.map(step => step.to_handle),
  ]
  const generations = new Map([[path[0], 0]])
  for (const step of steps) {
    const difference =
      step.relation === 'child' ? 1 : step.relation === 'parent' ? -1 : 0
    generations.set(
      step.to_handle,
      generations.get(step.from_handle) + difference
    )
  }
  const structuralFamilies = new Map()
  for (const step of steps) {
    if (!['parent', 'child', 'sibling'].includes(step.relation)) continue
    const family = familiesByHandle.get(step.family_handle)
    if (!family) continue
    const childHandle =
      step.relation === 'child' ? step.to_handle : step.from_handle
    const generation = generations.get(childHandle) - 1
    const parents = [family.father_handle, family.mother_handle].filter(
      handle => byHandle.has(handle)
    )
    for (const handle of parents) {
      if (!generations.has(handle)) generations.set(handle, generation)
    }
    if (!structuralFamilies.has(family.handle)) {
      structuralFamilies.set(family.handle, {
        family,
        parents,
        children: new Set(),
      })
    }
    const {children} = structuralFamilies.get(family.handle)
    children.add(childHandle)
    if (step.relation === 'sibling') children.add(step.to_handle)
  }
  const handles = [...new Set([...path, ...byHandle.keys()])].filter(handle =>
    byHandle.has(handle)
  )
  const nodes = handles.map(handle => ({
    key: `person:${handle}`,
    kind: 'person',
    handle,
    person: byHandle.get(handle),
  }))
  const links = []
  for (const {family, parents, children} of structuralFamilies.values()) {
    const key = `family:${family.handle}`
    nodes.push({key, kind: 'family', family})
    for (const handle of parents)
      links.push({
        key: `${handle}->${key}`,
        kind: 'context',
        source: `person:${handle}`,
        target: key,
      })
    for (const handle of children)
      links.push({
        key: `${key}->${handle}`,
        kind: 'context',
        source: key,
        target: `person:${handle}`,
      })
  }
  for (const [index, step] of steps.entries()) {
    const [source, target] =
      step.relation === 'parent'
        ? [step.to_handle, step.from_handle]
        : [step.from_handle, step.to_handle]
    links.push({
      key: `connection:${index}`,
      kind: 'connection',
      relation: step.relation,
      relationshipType: step.relationship_type,
      source: `person:${source}`,
      target: `person:${target}`,
    })
  }
  return {nodes, links, generations, path}
}

export function connectionDot(model) {
  const {boxWidth, boxHeight} = relationshipLayoutDefaults
  const quote = value => JSON.stringify(value)
  const nodes = model.nodes.map(node =>
    node.kind === 'person'
      ? `${quote(node.key)} [shape=box fixedsize=true width=${
          boxWidth / 72
        } height=${boxHeight / 72} label=""]`
      : `${quote(node.key)} [shape=point width=0.1 height=0.1 label=""]`
  )
  const ranks = new Map()
  for (const [handle, generation] of model.generations) {
    if (!ranks.has(generation)) ranks.set(generation, [])
    ranks.get(generation).push(`person:${handle}`)
  }
  const rankGroups = [...ranks.values()].map(
    keys => `{rank=same; ${keys.map(quote).join('; ')}}`
  )
  const links = model.links.map(link => {
    const constraint =
      link.kind !== 'connection' || ['parent', 'child'].includes(link.relation)
    return `${quote(link.source)} -> ${quote(link.target)} [id=${quote(
      link.key
    )} dir=none constraint=${constraint} weight=100]`
  })
  // Preserve the order along the path within each generation. Database row
  // order and extra relatives must not shuffle siblings or partners.
  const pathRanks = new Map()
  for (const handle of model.path) {
    const generation = model.generations.get(handle)
    if (!pathRanks.has(generation)) pathRanks.set(generation, [])
    pathRanks.get(generation).push(`person:${handle}`)
  }
  for (const keys of pathRanks.values()) {
    for (let i = 1; i < keys.length; i += 1)
      links.push(
        `${quote(keys[i - 1])} -> ${quote(keys[i])} [style=invis weight=100]`
      )
  }
  return `digraph connection {rankdir=TB charset="UTF-8" pad=0.5 nodesep=0.5 ranksep=0.8 splines=polyline ${[
    ...nodes,
    ...rankGroups,
    ...links,
  ].join('\n')}}`
}

let graphvizLoading
export async function layoutConnection(
  people,
  rootHandle,
  steps,
  families = []
) {
  const model = connectionModel(people, rootHandle, steps, families)
  graphvizLoading ??= Graphviz.load().catch(error => {
    graphvizLoading = undefined
    throw error
  })
  const graphviz = await graphvizLoading
  const output = JSON.parse(
    graphviz.layout(connectionDot(model), 'json', 'dot')
  )
  const positions = new Map(
    output.objects
      .filter(node => node.pos)
      .map(node => [node.name, node.pos.split(',').map(Number)])
  )
  const nodes = model.nodes.map(node => {
    const [x, y] = positions.get(node.key)
    return {...node, x, y: -y}
  })
  const byKey = new Map(nodes.map(node => [node.key, node]))
  const routes = new Map(
    (output.edges ?? [])
      .filter(edge => edge.id)
      .map(edge => [
        edge.id,
        edge.pos
          .split(' ')
          .filter(token => token && !/^[se],/.test(token))
          .map(token => {
            const [x, y] = token.split(',').map(Number)
            return [x, -y]
          }),
      ])
  )
  const links = model.links.map(link => ({
    ...link,
    source: byKey.get(link.source),
    target: byKey.get(link.target),
    points: routes.get(link.key),
  }))
  const root = byKey.get(`person:${rootHandle}`)
  const [originX, originY] = [root.x, root.y]
  for (const node of nodes) {
    node.x -= originX
    node.y -= originY
  }
  for (const link of links)
    link.points = link.points.map(([x, y]) => [x - originX, y - originY])
  const [x0, y0, x1, y1] = output.bb.split(',').map(Number)
  return {
    nodes,
    links,
    root,
    bounds: {
      xMin: x0 - originX,
      xMax: x1 - originX,
      yMin: -y1 - originY,
      yMax: -y0 - originY,
    },
  }
}
