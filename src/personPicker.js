export const PERSON_PICKER_CREATED_EVENT = 'person-picker:created'

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
