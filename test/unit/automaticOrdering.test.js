import {describe, expect, it} from 'vitest'
import {sortEventsByDate} from '../../src/util/reorder.js'
import {GrampsjsTags} from '../../src/components/GrampsjsTags.js'
import {GrampsjsChildren} from '../../src/components/GrampsjsChildren.js'

const event = (type, day, month, year, sortval) => ({
  type,
  date: {dateval: [day, month, year, false], sortval},
})

describe('automatic chronology', () => {
  it.each(['Burial', 'Funeral', 'Cremation'])(
    'places year-only %s after precise death in the same year',
    type => {
      const burial = event(type, 0, 0, 1126, 2132323)
      const death = event('Death', 13, 12, 1126, 2132669)
      expect(sortEventsByDate([burial, death])).toEqual([death, burial])
    }
  )
  it('does not hide conflicting exact dates by changing their order', () => {
    const burial = event('Burial', 1, 12, 1126, 2132657)
    const death = event('Death', 13, 12, 1126, 2132669)
    expect(sortEventsByDate([burial, death])).toEqual([burial, death])
  })
  it('places birth before baptism when an imprecise date overlaps', () => {
    const baptism = event('Baptism', 0, 0, 1707, 2344529)
    const birth = event('Birth', 12, 2, 1707, 2344571)
    expect(sortEventsByDate([baptism, birth])).toEqual([birth, baptism])
  })
  it('does not offer manual child ordering', () => {
    expect(new GrampsjsChildren().hasReorder).toBe(false)
  })
})

describe('empty tags', () => {
  it.each([[], [{name: 'internal', color: '#000000'}]])(
    'hides the section when no visible tags remain',
    (...tags) => {
      const el = new GrampsjsTags()
      el.appState = {permissions: {canAdd: true}, i18n: {strings: {}}}
      el.data = tags.flat()
      el.hideTags = ['internal']
      expect(el.render().strings.join('')).toBe('')
      el.edit = true
      expect(el.render().strings.join('')).not.toBe('')
    }
  )
})
