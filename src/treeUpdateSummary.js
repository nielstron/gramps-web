const TYPES = {
  Person: ['Person', 'People'],
  Family: ['Family', 'Families'],
  Event: ['Event', 'Events'],
  Place: ['Place', 'Places'],
  Source: ['Source', 'Sources'],
  Citation: ['Citation', 'Citations'],
  Repository: ['Repository', 'Repositories'],
  Media: ['Media', 'Media'],
  Note: ['Note', 'Notes'],
  Tag: ['Tag', 'Tags'],
}
const ACTIONS = ['Added', 'Updated', 'Deleted']

export function treeUpdateSummary(changes = [], translate = key => key) {
  if (!changes.length) return translate('Family tree changed.')
  return changes
    .map(
      ({type, action, count}) =>
        `${translate(ACTIONS[action])}: ${count} ${translate(
          TYPES[type][count === 1 ? 0 : 1]
        )}`
    )
    .join(' · ')
}
