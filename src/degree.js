const ACADEMIC_EVENT_TYPES = new Set(['Degree', 'Graduation'])
const TITLE_ATTRIBUTE_BY_EVENT_TYPE = new Map([
  ['Degree', 'Degree'],
  ['Graduation', 'Degree'],
  ['Coronation', 'Title'],
])

function typeString(type) {
  return typeof type === 'string' ? type : type?.string || ''
}

export function isAcademicEvent(event) {
  return ACADEMIC_EVENT_TYPES.has(typeString(event?.type))
}

export function eventTitleAttributeType(event) {
  return TITLE_ATTRIBUTE_BY_EVENT_TYPE.get(typeString(event?.type)) || ''
}

export function isTitleEvent(event) {
  return Boolean(eventTitleAttributeType(event))
}

export function eventTitleFromEvent(event) {
  const attributeType = eventTitleAttributeType(event)
  const attribute = (event?.attribute_list || []).find(
    item => typeString(item.type) === attributeType
  )
  return attribute?.value || ''
}

export function withEventTitleAttribute(event, title) {
  const attributeType = eventTitleAttributeType(event)
  const attributes = (event?.attribute_list || []).filter(
    item => typeString(item.type) !== attributeType
  )
  const value = title.trim()
  if (value) {
    attributes.push({_class: 'Attribute', type: attributeType, value})
  }
  return {...event, attribute_list: attributes}
}

export function degreeFromEvent(event) {
  const attribute = (event?.attribute_list || []).find(
    item => typeString(item.type) === 'Degree'
  )
  return attribute?.value || ''
}

export function withDegreeAttribute(event, degree) {
  const attributes = (event?.attribute_list || []).filter(
    item => typeString(item.type) !== 'Degree'
  )
  const value = degree.trim()
  if (value) {
    attributes.push({_class: 'Attribute', type: 'Degree', value})
  }
  return {...event, attribute_list: attributes}
}
