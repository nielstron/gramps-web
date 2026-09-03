export const MANUAL_EVENT_ORDER_ATTRIBUTE = '_gramps_web_manual_event_order'

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

export function sortEventsByDate(events) {
  return events
    .map((event, index) => ({event, index}))
    .sort((a, b) => {
      const aSort = Number(a.event?.date?.sortval)
      const bSort = Number(b.event?.date?.sortval)
      const aDated = Number.isFinite(aSort) && aSort > 0
      const bDated = Number.isFinite(bSort) && bSort > 0
      if (aDated !== bDated) {
        return aDated ? -1 : 1
      }
      if (aDated && aSort !== bSort) {
        return aSort - bSort
      }
      return a.index - b.index
    })
    .map(({event}) => event)
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
