import {describe, expect, it} from 'vitest'

import {
  formatDistantGermanLinealRelationship,
  GrampsjsPersonRelationship,
} from '../../src/components/GrampsjsPersonRelationship.js'

describe('person relationship', () => {
  it('searches deeply enough not to stop at the named Erzahnen generations', () => {
    const element = new GrampsjsPersonRelationship()
    element.person1 = 'home'
    element.person2 = 'ancestor'
    element.appState = {i18n: {lang: 'de'}}

    expect(element.getUrl()).to.contain('depth=100')
  })

  it('uses repeated Ur for a direct ancestor beyond the named range', () => {
    expect(
      formatDistantGermanLinealRelationship(
        {
          distance_common_origin: 27,
          distance_common_other: 0,
          relationship_string: '(XXVI) Urgroßmutter',
        },
        'F'
      )
    ).to.equal(`Ur${'ur'.repeat(24)}großmutter`)
  })
})
