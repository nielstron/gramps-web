import {describe, expect, it} from 'vitest'
import {groupEventTypes} from '../../src/util/eventTypeGroups.js'

describe('groupEventTypes', () => {
  it('uses the Gramps topics and sorts within them by translated label', () => {
    const translations = {
      Birth: 'Geburt',
      Death: 'Tod',
      Divorce: 'Scheidung',
      Marriage: 'Ehe',
    }
    const translate = value => translations[value] || value

    const groups = groupEventTypes(
      [
        'Census',
        'Divorce',
        'Occupation',
        'Death',
        'Future Gramps event',
        'Education',
        'Marriage',
        'Birth',
      ],
      ['Zulu custom', 'Alpha custom'],
      translate,
      'de'
    )

    expect(groups).toEqual([
      {label: 'Life Events', types: ['Birth', 'Death']},
      {label: 'Family', types: ['Marriage', 'Divorce']},
      {label: 'Vocational', types: ['Occupation']},
      {label: 'Academic', types: ['Education']},
      {label: 'Residence', types: ['Census']},
      {label: 'Other', types: ['Future Gramps event']},
      {label: 'Custom', types: ['Alpha custom', 'Zulu custom']},
    ])
  })

  it('places uncategorized standard types in Other without duplicates', () => {
    const groups = groupEventTypes(
      ['Unknown', 'Cause Of Death', 'Unknown'],
      ['Cause Of Death', 'My event', 'My event']
    )

    expect(groups).toEqual([
      {label: 'Other', types: ['Cause Of Death', 'Unknown']},
      {label: 'Custom', types: ['My event']},
    ])
  })
})
