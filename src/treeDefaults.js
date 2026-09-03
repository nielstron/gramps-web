export const TREE_VIEWS = [
  'ancestor',
  'descendant',
  'hourglass',
  'relationship',
  'fan',
]

export const DEFAULT_TREE_VIEW = 'relationship'

export function getTreeViewTabIndex(view) {
  const index = TREE_VIEWS.indexOf(view)
  if (index !== -1) {
    return index
  }
  return TREE_VIEWS.indexOf(DEFAULT_TREE_VIEW)
}

export function getTreeViewForTab(index) {
  return TREE_VIEWS[index] ?? DEFAULT_TREE_VIEW
}

export function normalizeTreeView(view) {
  return TREE_VIEWS.includes(view) ? view : DEFAULT_TREE_VIEW
}

export function getTreePath(view, grampsId) {
  return `tree/${normalizeTreeView(view)}/${grampsId}`
}
