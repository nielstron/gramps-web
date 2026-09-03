import {describe, expect, it} from 'vitest'

import {
  MANUAL_EVENT_ORDER_ATTRIBUTE,
  hasManualEventOrder,
  moveToIndex,
  reorderEventRefs,
  reorderPersonEventRefs,
} from '../../src/util/reorder.js'
import {GrampsjsEvents} from '../../src/components/GrampsjsEvents.js'

describe('moveToIndex', () => {
  it('moves an item over several positions without losing entries', () => {
    expect(moveToIndex(['a', 'b', 'c', 'd'], 0, 2)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ])
  })

  it('moves an item backwards', () => {
    expect(moveToIndex(['a', 'b', 'c', 'd'], 3, 1)).toEqual([
      'a',
      'd',
      'b',
      'c',
    ])
  })

  it('leaves invalid and unchanged moves alone', () => {
    const values = ['a', 'b']
    expect(moveToIndex(values, 1, 1)).toBe(values)
    expect(moveToIndex(values, -1, 1)).toBe(values)
    expect(moveToIndex(values, 0, 2)).toBe(values)
    expect(moveToIndex(values, undefined, 1)).toBe(values)
  })
})

describe('editable-list drag reorder', () => {
  it('optimistically reorders events and emits one semantic action', () => {
    const events = new GrampsjsEvents()
    events.edit = true
    events.data = [{handle: 'a'}, {handle: 'b'}, {handle: 'c'}]
    let detail
    events.addEventListener('edit:action', event => {
      detail = event.detail
    })

    events._handleReorder(0, 2)

    expect(events._dragData.map(event => event.handle)).toEqual(['b', 'c', 'a'])
    expect(detail).toEqual({
      action: 'reorderEvent',
      oldIndex: 0,
      newIndex: 2,
      order: [1, 2, 0],
      manual: true,
    })
  })

  it('allows a chronological list to be switched to manual order by dragging', () => {
    const events = new GrampsjsEvents()
    events.edit = true
    events.sorted = true
    events.data = [{handle: 'a'}, {handle: 'b'}]

    expect(events._canDragReorder()).toBe(true)
  })

  it('orders events chronologically until an explicit order exists', () => {
    const events = new GrampsjsEvents()
    events.data = [
      {handle: 'late', date: {sortval: 200}},
      {handle: 'unknown'},
      {handle: 'early', date: {sortval: 100}},
    ]
    events.eventRef = [{ref: 'late'}, {ref: 'unknown'}, {ref: 'early'}]

    expect(
      events.sortData([...events.data]).map(event => event.handle)
    ).toEqual(['early', 'late', 'unknown'])

    events.eventRef[0].attribute_list = [
      {type: MANUAL_EVENT_ORDER_ATTRIBUTE, value: '1'},
    ]
    expect(
      events.sortData([...events.data]).map(event => event.handle)
    ).toEqual(['late', 'unknown', 'early'])
  })

  it('emits the complete source-index order when dragging sorted events', () => {
    const events = new GrampsjsEvents()
    events.edit = true
    events.data = [
      {handle: 'late', date: {sortval: 200}},
      {handle: 'early', date: {sortval: 100}},
    ]
    events.eventRef = [{ref: 'late'}, {ref: 'early'}]
    let detail
    events.addEventListener('edit:action', event => {
      detail = event.detail
    })

    events._handleReorder(0, 1)

    expect(detail).toEqual({
      action: 'reorderEvent',
      oldIndex: 0,
      newIndex: 1,
      order: [0, 1],
      manual: true,
    })
  })
})

describe('explicit event order', () => {
  it('marks reordered references without dropping reference metadata', () => {
    const refs = [
      {ref: 'birth', role: 'Primary', attribute_list: []},
      {ref: 'job', role: 'Witness', note_list: ['note']},
    ]

    const reordered = reorderEventRefs(refs, [1, 0])

    expect(reordered.map(ref => ref.ref)).toEqual(['job', 'birth'])
    expect(reordered[0].note_list).toEqual(['note'])
    expect(reordered[1].role).toBe('Primary')
    expect(hasManualEventOrder(reordered)).toBe(true)
  })

  it('keeps the canonical birth and death events when their indices move', () => {
    const person = {
      birth_ref_index: 0,
      death_ref_index: 2,
      event_ref_list: [{ref: 'birth'}, {ref: 'job'}, {ref: 'death'}],
    }

    const reordered = reorderPersonEventRefs(person, [1, 2, 0])

    expect(reordered.event_ref_list.map(ref => ref.ref)).toEqual([
      'job',
      'death',
      'birth',
    ])
    expect(reordered.birth_ref_index).toBe(2)
    expect(reordered.death_ref_index).toBe(1)
  })

  it('removes the manual marker when chronological order is restored', () => {
    const refs = [
      {
        ref: 'death',
        attribute_list: [
          {type: MANUAL_EVENT_ORDER_ATTRIBUTE, value: '1', private: true},
        ],
      },
      {
        ref: 'birth',
        attribute_list: [
          {type: MANUAL_EVENT_ORDER_ATTRIBUTE, value: '1', private: true},
        ],
      },
    ]

    const reordered = reorderEventRefs(refs, [1, 0], false)

    expect(reordered.map(ref => ref.ref)).toEqual(['birth', 'death'])
    expect(hasManualEventOrder(reordered)).toBe(false)
  })
})
