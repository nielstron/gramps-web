import {describe, it, expect} from 'vitest'
import {NAVIGATION_ITEMS, navigationMode} from '../../src/navigation.js'

describe('tree navigation preferences', () => {
  it('preserves existing defaults and the legacy DNA setting', () => {
    for (const item of NAVIGATION_ITEMS)
      expect(navigationMode({}, item.id)).toBe('visible')
    expect(navigationMode({frontendConfig: {hideDNALink: true}}, 'dna')).toBe(
      'hidden'
    )
  })
  it('supports visible, hidden, and advanced independently per tree', () => {
    const tree = {
      treeConfig: {
        'frontend.navigation.media': 'advanced',
        'frontend.navigation.lists': 'hidden',
      },
    }
    expect(navigationMode(tree, 'media')).toBe('advanced')
    expect(navigationMode(tree, 'lists')).toBe('hidden')
    expect(navigationMode(tree, 'home')).toBe('visible')
    expect(navigationMode({}, 'media')).toBe('visible')
  })
  it('lets an explicit tree preference override legacy DNA visibility', () => {
    expect(
      navigationMode(
        {
          frontendConfig: {hideDNALink: true},
          treeConfig: {'frontend.navigation.dna': 'visible'},
        },
        'dna'
      )
    ).toBe('visible')
  })
})
