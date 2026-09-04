export const MANUAL_EVENT_ORDER_ATTRIBUTE = '_gramps_web_manual_event_order'

const START_OF_LIFE_EVENT_TYPES = new Set(['Birth', 'Stillbirth'])
const END_OF_LIFE_EVENT_TYPES = new Set(['Death', 'Cause Of Death'])
const POST_DEATH_EVENT_TYPES = new Set(['Burial', 'Cremation', 'Probate'])
const UNDATED_LIFE_EVENT_PHASE = new Map([
  ['Adopted', 1],
  ['Baptism', 1],
  ['Blessing', 1],
  ['Christening', 1],
  ['First Communion', 1],
  ['Bar Mitzvah', 2],
  ['Bat Mitzvah', 2],
  ['Confirmation', 2],
  ['Adult Christening', 2],
  ['Education', 3],
  ['Graduation', 3],
  ['Degree', 4],
  ['Occupation', 6],
  ['Military Service', 6],
  ['Ordination', 6],
  ['Elected', 6],
  ['Retirement', 8],
])

export function moveToIndex(array, oldIndex, newIndex) {
  if (
    !Number.isInteger(oldIndex) ||
    !Number.isInteger(newIndex) ||
    oldIndex === newIndex ||
    oldIndex < 0 ||
    newIndex < 0 ||
    oldIndex >= array.length ||
    newIndex >= array.length
  ) {
    return array
  }
  const reordered = [...array]
  const [item] = reordered.splice(oldIndex, 1)
  reordered.splice(newIndex, 0, item)
  return reordered
}

function eventTypeName(event) {
  return typeof event?.type === 'string' ? event.type : event?.type?.value
}

export function sortEventsByKnownOrder(
  items,
  {getEvent = item => item, getOrder = item => Number(item?.date?.sortval)} = {}
) {
  const records = items.map((item, index) => {
    const event = getEvent(item)
    const order = Number(getOrder(item))
    return {
      event,
      index,
      item,
      order,
      hasKnownOrder: Number.isFinite(order) && order > 0,
      type: eventTypeName(event),
    }
  })
  const knownOrders = records.filter(record => record.hasKnownOrder)
  const firstKnownOrder = Math.min(...knownOrders.map(record => record.order))
  const lastKnownOrder = Math.max(...knownOrders.map(record => record.order))
  const deathOrder = Math.min(
    ...knownOrders
      .filter(record => END_OF_LIFE_EVENT_TYPES.has(record.type))
      .map(record => record.order)
  )
  const postDeathOrder = Math.min(
    ...knownOrders
      .filter(record => POST_DEATH_EVENT_TYPES.has(record.type))
      .map(record => record.order)
  )

  const inferredOrder = record => {
    if (record.hasKnownOrder) return record.order
    if (START_OF_LIFE_EVENT_TYPES.has(record.type)) {
      return Number.isFinite(firstKnownOrder) ? firstKnownOrder - 1 : 0
    }
    if (POST_DEATH_EVENT_TYPES.has(record.type)) {
      return Number.isFinite(lastKnownOrder) ? lastKnownOrder + 1 : 3
    }
    if (END_OF_LIFE_EVENT_TYPES.has(record.type)) {
      if (Number.isFinite(postDeathOrder)) return postDeathOrder - 0.5
      return Number.isFinite(lastKnownOrder) ? lastKnownOrder + 1 : 2
    }
    const phase = (UNDATED_LIFE_EVENT_PHASE.get(record.type) || 5) / 10
    if (Number.isFinite(deathOrder)) return deathOrder - 1 + phase
    if (Number.isFinite(postDeathOrder)) return postDeathOrder - 1 + phase
    return Number.isFinite(lastKnownOrder)
      ? lastKnownOrder + 1 + phase
      : 1 + phase
  }

  return records
    .sort((a, b) => inferredOrder(a) - inferredOrder(b) || a.index - b.index)
    .map(record => record.item)
}

export function sortEventsByDate(events) {
  return sortEventsByKnownOrder(events)
}

export function hasManualEventOrder(eventRefs = []) {
  return eventRefs.some(ref =>
    (ref.attribute_list || []).some(
      attribute => attribute.type === MANUAL_EVENT_ORDER_ATTRIBUTE
    )
  )
}

function withManualEventOrder(ref) {
  const attributes = (ref.attribute_list || []).filter(
    attribute => attribute.type !== MANUAL_EVENT_ORDER_ATTRIBUTE
  )
  return {
    ...ref,
    attribute_list: [
      ...attributes,
      {
        _class: 'Attribute',
        private: false,
        type: MANUAL_EVENT_ORDER_ATTRIBUTE,
        value: '1',
      },
    ],
  }
}

function withoutManualEventOrder(ref) {
  return {
    ...ref,
    attribute_list: (ref.attribute_list || []).filter(
      attribute => attribute.type !== MANUAL_EVENT_ORDER_ATTRIBUTE
    ),
  }
}

export function reorderEventRefs(eventRefs, sourceOrder, manual = true) {
  if (
    sourceOrder.length !== eventRefs.length ||
    new Set(sourceOrder).size !== eventRefs.length ||
    sourceOrder.some(index => index < 0 || index >= eventRefs.length)
  ) {
    throw new Error('Event order must be a permutation of all event references')
  }
  const prepareRef = manual ? withManualEventOrder : withoutManualEventOrder
  return sourceOrder.map(index => prepareRef(eventRefs[index]))
}

export function reorderPersonEventRefs(person, sourceOrder, manual = true) {
  const birthHandle = person.event_ref_list[person.birth_ref_index]?.ref
  const deathHandle = person.event_ref_list[person.death_ref_index]?.ref
  const eventRefList = reorderEventRefs(
    person.event_ref_list,
    sourceOrder,
    manual
  )
  return {
    ...person,
    event_ref_list: eventRefList,
    birth_ref_index: birthHandle
      ? eventRefList.findIndex(ref => ref.ref === birthHandle)
      : -1,
    death_ref_index: deathHandle
      ? eventRefList.findIndex(ref => ref.ref === deathHandle)
      : -1,
  }
}
