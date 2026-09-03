const ACADEMIC_EVENT_TYPES = new Set(['Degree', 'Graduation'])

function typeString(type) {
  return typeof type === 'string' ? type : type?.string || ''
}

export function isAcademicEvent(event) {
  return ACADEMIC_EVENT_TYPES.has(typeString(event?.type))
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
