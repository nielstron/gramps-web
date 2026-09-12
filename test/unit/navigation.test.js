import {describe, it, expect} from 'vitest'
import {
  NAVIGATION_ITEMS,
  navigationMode,
  availableNavigationItems,
} from '../../src/navigation.js'

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

it('hides empty bookmarks and respects visible/advanced/hidden once populated', () => {
  const state = {treeConfig: {}}
  const visibleIds = bookmarks =>
    availableNavigationItems(state, bookmarks)
      .filter(item => navigationMode(state, item.id) !== 'hidden')
      .map(item => item.id)
  expect(visibleIds(undefined)).not.toContain('bookmarks')
  expect(visibleIds({people: [], families: []})).not.toContain('bookmarks')
  expect(visibleIds({people: ['handle']})).toContain('bookmarks')
  state.treeConfig['frontend.navigation.bookmarks'] = 'advanced'
  expect(visibleIds({people: ['handle']})).toContain('bookmarks')
  expect(navigationMode(state, 'bookmarks')).toBe('advanced')
  state.treeConfig['frontend.navigation.bookmarks'] = 'hidden'
  expect(visibleIds({people: ['handle']})).not.toContain('bookmarks')
})
