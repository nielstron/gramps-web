// Visibility is a presentation preference, not an access permission.
export const NAVIGATION_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    pages: ['home'],
    group: 0,
  },
  {
    id: 'blog',
    label: 'Blog',
    path: '/blog',
    pages: ['blog'],
    group: 0,
  },
  {
    id: 'tree',
    label: 'Family Tree',
    path: '/tree',
    pages: ['tree'],
    group: 0,
  },
  {
    id: 'timeline',
    label: 'Timeline',
    path: '/timeline',
    pages: ['timeline'],
    group: 0,
  },
  {
    id: 'map',
    label: 'Map',
    path: '/map',
    pages: ['map'],
    group: 0,
  },
  {
    id: 'dna',
    label: 'DNA',
    path: '/dna-matches',
    pages: ['dna-matches', 'dna-chromosome', 'ydna'],
    group: 0,
  },
  {
    id: 'lists',
    label: 'Lists',
    path: '/people',
    pages: [
      'people',
      'families',
      'events',
      'places',
      'citations',
      'sources',
      'repositories',
      'notes',
    ],
    group: 0,
  },
  {
    id: 'media',
    label: 'Media',
    path: '/medialist',
    pages: ['medialist'],
    group: 0,
  },
  {
    id: 'chat',
    label: 'Assistant',
    path: '/chat',
    pages: ['chat'],
    group: 0,
  },
  {
    id: 'history',
    label: 'History',
    path: '/recent',
    pages: ['recent'],
    group: 1,
  },
  {
    id: 'bookmarks',
    label: '_Bookmarks',
    path: '/bookmarks',
    pages: ['bookmarks'],
    group: 1,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    path: '/tasks',
    pages: ['tasks'],
    group: 1,
  },
  {
    id: 'reports',
    label: '_Reports',
    path: '/reports',
    pages: ['reports'],
    group: 1,
  },
  {
    id: 'export',
    label: 'Export',
    path: '/export',
    pages: ['export'],
    group: 1,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    pages: ['notifications'],
    group: 2,
  },
]

export const navigationConfigKey = id => `frontend.navigation.${id}`

export function navigationMode(appState, id) {
  const value = appState.treeConfig?.[navigationConfigKey(id)]
  if (value === false || value === 'hidden') return 'hidden'
  if (value === 'advanced') return 'advanced'
  if (value === true || value === 'visible') return 'visible'
  return id === 'dna' && appState.frontendConfig?.hideDNALink
    ? 'hidden'
    : 'visible'
}
