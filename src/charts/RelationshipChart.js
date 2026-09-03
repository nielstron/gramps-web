import {create, select} from 'd3-selection'
import {zoom} from 'd3-zoom'
import {linkVertical} from 'd3-shape'
import {Graphviz} from '@hpcc-js/wasm'
import {chartNameDisplayFormat} from '../util.js'
import {appendAddPersonButton} from './addPersonButton.js'
import {formatDateString} from '../date.js'
import {surnameWithBirthName} from '../name.js'

export {surnameWithBirthName} from '../name.js'

const sexColor = {
  F: 'var(--color-girl)',
  M: 'var(--color-boy)',
  X: 'var(--color-other)',
  U: 'var(--color-unknown)',
}

function createGraph(graph) {
  const data = graph.getData()

  // step 1: collect all persons to be shown
  for (const p of data) {
    graph.addPerson(p)
  }

  // step 2: create nodes for relevant families
  for (const p of data) {
    for (const f of p.extended.families) {
      if (graph.known(f.father_handle) && graph.known(f.mother_handle)) {
        graph.addNode(f, f.handle, f.father_handle, f.mother_handle)
      }
    }
    if (p.extended?.primary_parent_family?.handle) {
      const f = p.extended.primary_parent_family
      graph.addNode(f, f.handle, f.father_handle, f.mother_handle)
    }
  }

  // step 3: connect family junctions to their children
  for (const p of data) {
    const f = p.extended.primary_parent_family
    const me = p.handle
    const father = f.father_handle
    const mother = f.mother_handle
    if (graph.known(father) && graph.known(mother)) {
      graph.addEdge(f.handle, false, me)
    } else if (graph.known(father)) {
      graph.addEdge(f.handle, father, me)
    } else if (graph.known(mother)) {
      graph.addEdge(f.handle, mother, me)
    }
  }
}

export function generateDot(graph) {
  let dot = ''

  // Every person is one graph node, independent of how many families they
  // belong to. Graphviz can then optimize the whole relationship graph rather
  // than laying out duplicated couple cards.
  for (const p of graph.getPersons()) {
    dot += `
      "node_${p.handle}" [
        class="person_${p.handle}"
        margin=0.25
        shape="none"
        fixedsize=true
        width=${graph.boxWidth / 66}
        height=${graph.boxHeight / 66 - 0.3}
        label=<->
      ]
    `
  }

  // Treat every connected network of partners as a single horizontal block.
  // The invisible cluster is only an ordering hint; it does not draw or merge
  // nodes. Couple edges still have the stronger semantic weight below.
  for (const [index, component] of graph.getPartnerComponents().entries()) {
    dot += `
      subgraph "cluster_partners_${index}" {
        rank=same
        style=invis
        margin=0
        ${component.map(handle => `"node_${handle}"`).join('\n')}
      }
    `
  }

  // A family is a small junction below its parent nodes. Parent-to-family and
  // family-to-child edges give the layout engine the generational ordering,
  // while keeping every person in exactly one node.
  for (const n of graph.getNodes()) {
    const pf = n.father
    const pm = n.mother
    dot += `
      "node_${n.handle}" [
        class="family_${n.handle}"
        label=<.>
        shape="none"
        margin=0
        fixedsize=true
        width=0.1
        height=0.1
      ]
    `
    if (pf) {
      dot += `
        "node_${pf}" -> "node_${n.handle}" [class="couple", arrowhead=none, weight=100]
      `
    }
    if (pm) {
      dot += `
        "node_${pm}" -> "node_${n.handle}" [class="couple", arrowhead=none, weight=100]
      `
    }
  }

  // Family-to-child relationships determine the vertical generation layout.
  for (const e of graph.getEdges()) {
    if (graph.getNode(e.sourceFamily) && graph.known(e.targetPerson)) {
      dot += `"node_${e.sourceFamily}" -> "node_${e.targetPerson}" [class="child", label="", arrowhead=none, color="#555"]
      `
    }
  }

  // frame dot code with global commands
  dot = `
    digraph gramps {
      compound=true
      ranksep=2.8
      labelloc="t"
      charset="UTF-8"
      pad=2
      splines=polyline
      //splines=ortho
      //splines=spline
      // this controls the number of iterations = nslimit * no_nodes
      nslimit=2.0
      nodesep=0
      ${dot}
    }
  `
  return dot
}

export class Relgraph {
  constructor(data, boxWidth, boxHeight, grampsId) {
    this.data = data
    this.boxWidth = boxWidth
    this.boxHeight = boxHeight
    this.rootPersonGrampsId = grampsId
    this.rootPerson = undefined
    this.nodes = {}
    this.edges = {}
    this.edge_seen = {}
    this.person_node_map = {}
    this.persons = {}
    this.dot = undefined
    this.shrinkToFit = false
    createGraph(this)
  }

  getData() {
    return this.data
  }

  getDot() {
    if (!this.dot) {
      this.dot = generateDot(this)
    }
    return this.dot
  }

  addPerson(p) {
    const me = p.handle
    this.persons[me] = {
      handle: me,
      profile: p.profile,
      data: p,
    }
    if (p.gramps_id === this.rootPersonGrampsId) {
      this.rootPerson = this.persons[me]
    }
  }

  getRootPerson() {
    return this.rootPerson
  }

  getPersons() {
    return Object.values(this.persons)
  }

  known(me) {
    return this.persons[me] || false
  }

  addNode(fdata, family, father, mother) {
    const n = {
      handle: family,
      type: fdata?.type,
      fake: fdata?.fake,
    }
    if (father && this.known(father)) {
      n.father = father
      // remember in which nodes these person can be found
      this.person_node_map[father] = this.person_node_map[father] ?? {}
      this.person_node_map[father][family] = true
      // map persondata into node
      n.fatherdata = this.known(father)
    }
    if (mother && this.known(mother)) {
      n.mother = mother
      // remember in which nodes these person can be found
      this.person_node_map[mother] = this.person_node_map[mother] ?? {}
      this.person_node_map[mother][family] = true
      // map persondata into node
      n.motherdata = this.known(mother)
    }
    if (n.father || n.mother) {
      this.nodes[family] = n
    }
  }

  getNode(family) {
    return this.nodes[family] || false
  }

  getNodes() {
    return Object.values(this.nodes)
  }

  getNodesOfPerson(me) {
    if (this.person_node_map[me]) {
      const x = Object.keys(this.person_node_map[me])
      return x
    }
    return []
  }

  getPartnerComponents() {
    const adjacency = new Map()
    for (const node of this.getNodes()) {
      if (!node.father || !node.mother) {
        continue
      }
      if (!adjacency.has(node.father)) adjacency.set(node.father, new Set())
      if (!adjacency.has(node.mother)) adjacency.set(node.mother, new Set())
      adjacency.get(node.father).add(node.mother)
      adjacency.get(node.mother).add(node.father)
    }

    const components = []
    const seen = new Set()
    for (const person of this.getPersons()) {
      if (seen.has(person.handle) || !adjacency.has(person.handle)) {
        continue
      }
      const component = []
      const pending = [person.handle]
      seen.add(person.handle)
      while (pending.length) {
        const handle = pending.pop()
        component.push(handle)
        for (const partner of adjacency.get(handle) ?? []) {
          if (!seen.has(partner)) {
            seen.add(partner)
            pending.push(partner)
          }
        }
      }
      components.push(component)
    }
    return components
  }

  addEdge(sourcefamily, sourceperson, targetperson) {
    const key = `${sourcefamily}__${sourceperson}__${targetperson}`
    this.edges[key] = {
      sourceFamily: sourcefamily,
      sourcePerson: sourceperson,
      targetPerson: targetperson,
    }
  }

  getEdges() {
    return Object.values(this.edges)
  }
}

const clipString = (s, length) => {
  if (!s) {
    return ''
  }
  const fontSize = 13
  const nChar = length / (fontSize * 0.6)
  if (s.length <= nChar) {
    return s
  }
  if (nChar < 2) {
    return ''
  }
  return `${s.slice(0, nChar - 2)}…`
}

export function openPersonProfile(event, d) {
  this.dispatchEvent(
    new CustomEvent('nav', {
      bubbles: true,
      composed: true,
      detail: {path: `person/${d.profile?.gramps_id}`},
    })
  )
}
function remasterChart(
  divhidden,
  targetsvg,
  graph,
  boxWidth,
  boxHeight,
  imgPadding,
  getImageUrl,
  maxImages,
  nameDisplayFormat,
  bornLabel,
  locale,
  canEdit = false
) {
  const gvchartx = divhidden.select('svg')
  const nodedata = []
  const imgRadius = (boxHeight - imgPadding * 2) / 2
  const textPadding = d =>
    d.imageUrl ? 2 * imgRadius + 2 * imgPadding : 2 * imgPadding
  const boxWidthTotal = d => boxWidth - textPadding(d)
  gvchartx.selectAll('title').remove()
  // based on graphviz created nodes build array containing node data to be bound to d3 nodes
  let imageCount = 0
  gvchartx.selectAll('.node').each(function () {
    const e = select(this)
    const textElement = e.select('text')
    const x = textElement.attr('x')
    const y = textElement.attr('y')
    const c = e.attr('class')
    const found = c.match(/(?<handletype>family|person)_(?<handle>\S+)/)
    if (found.groups.handletype === 'person') {
      const d = graph.known(found.groups.handle)
      const imageUrl = getImageUrl(d)
      if (imageUrl) {
        imageCount += 1
      }
      nodedata.push({
        nodetype: d.profile.fake ? 'fake' : 'person',
        xCoord: x - boxWidth / 2 + 4,
        yCoord: y - boxHeight / 2,
        profile: d.profile,
        data: d.data,
        imageUrl: imageCount > maxImages ? '' : imageUrl,
        handle: found.groups.handle,
      })
    } else if (found.groups.handletype === 'family') {
      const d = graph.getNode(found.groups.handle)
      nodedata.push({
        nodetype: 'family',
        xCoord: x,
        yCoord: y,
        type: d.type,
        handle: found.groups.handle,
      })
    }
  })
  // container for edges
  const edges = targetsvg.append('g').attr('class', 'edges')

  // build d3 based nodes with data bound to them
  const nodes = targetsvg
    .selectAll('.node')
    .data(nodedata)
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.xCoord} ${d.yCoord})`)
    .attr('class', d => `node ${d.nodetype}`)

  nodes
    .filter(d => d.nodetype === 'person')
    .append('rect')
    .attr('fill', d => sexColor[d.profile?.sex] ?? 'var(--color-unknown)')
    .attr('width', 24)
    .attr('height', boxHeight - 1)
    .attr('x', -4)
    .attr('y', 0)
    .attr('rx', 12)
    .attr('ry', 12)

  nodes
    .filter(d => d.nodetype === 'person')
    .append('rect', ':first-child')
    .attr('width', boxWidth)
    .attr('height', boxHeight)
    .attr('class', 'personBox')
    .attr('x', 0)
    .attr('y', 0)
    .attr('rx', 8)
    .attr('ry', 8)

  nodes
    .filter(
      d =>
        (d.profile?.name_given || d.profile?.name_surname) &&
        d.nodetype === 'person'
    )
    .append('text')
    .attr('text-anchor', 'start')
    .attr('font-weight', '500')
    .attr('fill', 'var(--grampsjs-body-font-color-90)')
    .attr('paint-order', 'stroke')
    .attr('text-overflow', 'ellipsis')
    .attr('overflow', 'hidden')
    .attr('x', d => textPadding(d))
    .attr('y', 25)
    .text(d =>
      clipString(
        nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
          ? `${surnameWithBirthName(d.data, bornLabel)},`
          : d.profile?.name_given || '…',
        boxWidthTotal(d)
      )
    )

  nodes
    .filter(
      d =>
        (d.profile?.name_given || d.profile?.name_surname) &&
        d.nodetype === 'person'
    )
    .append('text')
    .attr('text-anchor', 'start')
    .attr('font-weight', '500')
    .attr('fill', 'var(--grampsjs-body-font-color-90)')
    .attr('paint-order', 'stroke')
    .attr('text-overflow', 'ellipsis')
    .attr('overflow', 'hidden')
    .attr('x', d => textPadding(d))
    .attr('y', 25 + 17)
    .text(d =>
      clipString(
        nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
          ? d.profile?.name_given || '…'
          : surnameWithBirthName(d.data, bornLabel),
        boxWidthTotal(d)
      )
    )

  nodes
    .filter(d => d.profile?.birth?.date && d.nodetype === 'person')
    .append('text')
    .attr('text-anchor', 'start')
    .attr('font-weight', '350')
    .attr('fill', 'var(--grampsjs-body-font-color-90)')
    .attr('paint-order', 'stroke')
    .attr('x', d => textPadding(d))
    .attr('y', 25 + 17 * 2)
    .text(d =>
      clipString(
        `*${formatDateString(d.profile.birth.date, locale)}`,
        boxWidthTotal(d)
      )
    )

  nodes
    .filter(d => d.profile?.death?.date && d.nodetype === 'person')
    .append('text')
    .attr('text-anchor', 'start')
    .attr('font-weight', '350')
    .attr('fill', 'var(--grampsjs-body-font-color-90)')
    .attr('paint-order', 'stroke')
    .attr('x', d => textPadding(d))
    .attr('y', 25 + 17 * 3)
    .text(d =>
      clipString(
        `†${formatDateString(d.profile.death.date, locale)}`,
        boxWidthTotal(d)
      )
    )

  // images
  nodes
    .filter(d => d.imageUrl)
    .append('circle')
    .attr('r', imgRadius)
    .attr('cy', imgRadius + imgPadding)
    .attr('cx', imgRadius + imgPadding)
    .attr('fill', d => `url(#imgpattern-${d.handle})`)

  const defs = targetsvg.append('defs')
  const imgPattern = defs
    .selectAll('.imgpattern')
    .data(nodedata)
    .enter()
    .filter(d => d.nodetype === 'person' && d.imageUrl)
    .append('pattern')
    .attr('id', d => `imgpattern-${d.handle}`)
    .attr('height', 1)
    .attr('width', 1)
    .attr('x', '0')
    .attr('y', '0')

  imgPattern
    .append('image')
    .attr('x', 0)
    .attr('y', 0)
    .attr('height', 70)
    .attr('width', 70)
    .attr('xlink:href', d => d.imageUrl)

  nodes
    .filter(d => d.type === 'Married' && d.nodetype === 'family')
    .append('circle')
    .attr('class', 'married')
    .attr('r', 6)
    .attr('cy', 0)
    .attr('stroke', 'var(--grampsjs-body-font-color-40)')
    .attr('fill', 'var(--grampsjs-color-shade-220)')

  nodes
    .filter(d => d.type === 'Married' && d.nodetype === 'family')
    .insert('line', ':first-child')
    .attr('class', 'married')
    .attr('x1', -11)
    .attr('x2', 11)
    .attr('y1', 0)
    .attr('y2', 0)
    .attr('stroke', 'var(--grampsjs-body-font-color-40)')
    .attr('stroke-width', 1)

  nodes
    .filter(d => d.nodetype === 'person')
    .style('cursor', canEdit ? 'default' : 'pointer')
    .on('click', canEdit ? null : openPersonProfile)
    .on('mouseenter', function (event, d) {
      if (canEdit) return
      if (window.matchMedia('(hover: none)').matches) return
      const grampsId = d.profile?.gramps_id
      if (!grampsId) return
      window.dispatchEvent(
        new CustomEvent('object:preview-show', {
          detail: {
            objectType: 'person',
            grampsId,
            anchorRect: this.getBoundingClientRect(),
          },
        })
      )
    })
    .on('mouseleave', () => {
      if (window.matchMedia('(hover: none)').matches) return
      window.dispatchEvent(new CustomEvent('object:preview-hide'))
    })

  if (canEdit) {
    appendAddPersonButton(
      nodes.filter(d => d.nodetype === 'person'),
      boxWidth - 14,
      14,
      d => d.handle
    )
  }

  const linkGenerator = linkVertical()
    .x(d => d.x)
    .y(d => d.y)
  // copy edges
  gvchartx.selectAll('.edge').each(function () {
    const graphvizEdge = select(this)
    const path = graphvizEdge.select('path')
    const pathData = path.attr('d')
    // extract points from path data
    const points = pathData
      ?.match(/-?[\d.]+,-?[\d.]+/g) // Find all "x,y" pairs
      ?.map(d => d.split(',').map(Number)) // Convert to [x, y] arrays
    if (!points) {
      return
    }
    // we use only the start and end point
    const firstAndLastPoint = [points[0], points[points.length - 1]]
    const isCouple = graphvizEdge.classed('couple')
    const pathValue = linkGenerator({
      source: {x: firstAndLastPoint[0][0], y: firstAndLastPoint[0][1]},
      target: {x: firstAndLastPoint[1][0], y: firstAndLastPoint[1][1]},
    })
    // we replace the polyline with a smooth connector from start to end
    edges
      .append('path')
      .attr('class', isCouple ? 'edge couple' : 'edge child')
      .attr('d', pathValue)
      .attr('fill', 'none')
      .attr('stroke', 'var(--grampsjs-body-font-color-40)')
      .attr('stroke-width', 1)
  })
  // edges.selectAll('path').attr('stroke-opacity', '0.4')

  // move root person to center
  nodes
    .filter(d => d.handle === graph.rootPerson?.handle)
    .each(d => {
      const rpc = {
        x: -1 * d.xCoord - boxWidth / 2,
        y: -1 * d.yCoord - boxHeight / 2,
      }
      targetsvg.attr('transform', `translate(${rpc.x} ${rpc.y})`)
    })

  // highlight root person
  nodes
    .filter(d => d.handle === graph.rootPerson?.handle)
    .style(
      'filter',
      'drop-shadow(0 3px 8px var(--grampsjs-body-font-color-30))'
    )

  // kill hidden graphviz generated svg
  gvchartx.remove()
}

export function RelationshipChart(
  data,
  {
    bboxWidth = 300,
    bboxHeight = 150,
    boxWidth = 190,
    boxHeight = 90,
    imgPadding = 10,
    getImageUrl = null,
    grampsId = 0,
    maxImages = 50,
    shrinkToFit = false,
    // orientation = 'LTR',
    nameDisplayFormat = chartNameDisplayFormat.surnameThenGiven,
    bornLabel = 'born',
    locale = undefined,
    canEdit = false,
    initialZoom = null,
  }
) {
  const resultnode = create('div').style('width', '100%')
  const divhidden = resultnode.append('div').style('display', 'none')
  const svg = resultnode
    .append('svg')
    .call(
      zoom().on('zoom', e =>
        svg.select('#chart-content').attr('transform', e.transform)
      )
    )
    .attr('font-family', 'Inter var')
    .attr('font-size', 13)

  const chartContent = svg.append('g').attr('id', 'chart-content')

  if (initialZoom) {
    svg.node().__zoom = initialZoom
    chartContent.attr('transform', initialZoom.toString())
  }
  const graph = new Relgraph(data, boxWidth, boxHeight, grampsId)
  const dot = graph.getDot()
  Graphviz.load().then(graphviz => {
    graphviz.dot(dot)
    divhidden.html(graphviz.layout(dot, 'svg', 'dot'))
    remasterChart(
      divhidden,
      chartContent.append('g'),
      graph,
      boxWidth,
      boxHeight,
      imgPadding,
      getImageUrl,
      maxImages,
      nameDisplayFormat,
      bornLabel,
      locale,
      canEdit
    )
    svg.attr('viewBox', [
      -bboxWidth / 2,
      -bboxHeight / 2,
      bboxWidth,
      bboxHeight,
    ])
    if (shrinkToFit) {
      const bbox = svg.node().getBBox()
      if (bbox.height > bboxHeight) {
        svg
          .attr('viewBox', [bbox.x, bbox.y - 20, bbox.width, bbox.height + 40])
          .attr('height', bboxHeight)
          .attr('width', bboxWidth)
      }
    }
  })

  return svg.node()
}
