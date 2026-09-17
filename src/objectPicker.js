export const OBJECT_PICKER_CREATED_EVENT = 'object-picker:created'
export const OBJECT_PICKER_CANCELLED_EVENT = 'object-picker:cancelled'

export const CREATABLE_OBJECT_TYPES = [
  'person',
  'family',
  'event',
  'place',
  'source',
  'citation',
  'repository',
  'note',
  'media',
]

export const newObjectLabel = {
  person: 'New Person',
  family: 'New Family',
  event: 'New Event',
  place: 'New Place',
  source: 'New Source',
  citation: 'New Citation',
  repository: 'New Repository',
  note: 'New Note',
  media: 'New Media Object',
}

const importNewObjectView = {
  person: () => import('./views/GrampsjsViewNewPerson.js'),
  family: () => import('./views/GrampsjsViewNewFamily.js'),
  event: () => import('./views/GrampsjsViewNewEvent.js'),
  place: () => import('./views/GrampsjsViewNewPlace.js'),
  source: () => import('./views/GrampsjsViewNewSource.js'),
  citation: () => import('./views/GrampsjsViewNewCitation.js'),
  repository: () => import('./views/GrampsjsViewNewRepository.js'),
  note: () => import('./views/GrampsjsViewNewNote.js'),
  media: () => import('./views/GrampsjsViewNewMedia.js'),
}

export function loadNewObjectView(objectType) {
  return importNewObjectView[objectType]()
}

export function pickerObjectTypes(objectType) {
  if (!objectType) return [...CREATABLE_OBJECT_TYPES]
  return objectType
    .split(',')
    .map(type => type.trim())
    .filter(type => CREATABLE_OBJECT_TYPES.includes(type))
}

export function objectSummariesUrl(objects, lang = 'en') {
  const references = objects
    .map(object => {
      const objectType = (
        object.objectType ||
        object.className ||
        ''
      ).toLowerCase()
      const identifier = object.handle || object.grampsId
      return objectType && identifier ? `${objectType}:${identifier}` : ''
    })
    .filter(Boolean)
  return references.length
    ? `/api/views/object-summaries?objects=${encodeURIComponent(
        references.join(',')
      )}&locale=${lang}`
    : ''
}

export function personNameFromQuery(query) {
  const normalized = query.trim().replace(/\s+/g, ' ')
  if (!normalized) return {_class: 'Name'}

  let firstName = ''
  let surname = ''
  const commaIndex = normalized.indexOf(',')
  if (commaIndex >= 0) {
    surname = normalized.slice(0, commaIndex).trim()
    firstName = normalized.slice(commaIndex + 1).trim()
  } else {
    const parts = normalized.split(' ')
    if (parts.length === 1) {
      firstName = parts[0]
    } else {
      surname = parts.pop()
      firstName = parts.join(' ')
    }
  }

  return {
    _class: 'Name',
    ...(firstName ? {first_name: firstName} : {}),
    ...(surname ? {surname_list: [{_class: 'Surname', surname}]} : {}),
  }
}
