const defaultGetGrampsId = d => d.data?.gramps_id || d.profile?.gramps_id

export function openPersonProfile(event, d, getGrampsId = defaultGetGrampsId) {
  const grampsId = getGrampsId(d)
  this.dispatchEvent(
    new CustomEvent('nav', {
      bubbles: true,
      composed: true,
      detail: {path: `person/${encodeURIComponent(grampsId)}`},
    })
  )
}

export function appendOpenPersonButton(
  nodeSelection,
  cx,
  cy,
  label,
  getGrampsId = defaultGetGrampsId
) {
  const button = nodeSelection
    .append('g')
    .attr('class', 'open-person-btn')
    .attr('transform', `translate(${cx}, ${cy})`)
    .attr('role', 'button')
    .attr('aria-label', label)
    .style('cursor', 'pointer')
    .style('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.35))')
    .on('click', function (event, d) {
      event.stopPropagation()
      event.preventDefault()
      openPersonProfile.call(this, event, d, getGrampsId)
    })
    .on('pointerdown', event => event.stopPropagation())

  button.append('circle').attr('r', 10).attr('fill', '#1976d2')

  button
    .append('circle')
    .attr('cx', -1)
    .attr('cy', -1)
    .attr('r', 3.5)
    .attr('fill', 'none')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 1.5)
    .style('pointer-events', 'none')

  button
    .append('line')
    .attr('x1', 2)
    .attr('y1', 2)
    .attr('x2', 5)
    .attr('y2', 5)
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 1.5)
    .attr('stroke-linecap', 'round')
    .style('pointer-events', 'none')
}
