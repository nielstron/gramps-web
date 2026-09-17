import {describe, expect, it} from 'vitest'
import {
  DEFAULT_TREE_VIEW,
  DEFAULT_TREE_DEPTH,
  TREE_VIEWS,
  getTreePath,
  getTreeViewTabIndex,
} from '../../src/treeDefaults.js'

describe('treeDefaults', () => {
  it('uses the relationship graph by default', () => {
    expect(DEFAULT_TREE_VIEW).to.equal('relationship')
    expect(DEFAULT_TREE_DEPTH).to.equal(10)
  })

  it('returns the correct index for known tree views', () => {
    TREE_VIEWS.forEach((view, index) => {
      expect(getTreeViewTabIndex(view)).to.equal(index)
    })
  })

  it('falls back to default view index for unknown values', () => {
    const defaultIndex = TREE_VIEWS.indexOf(DEFAULT_TREE_VIEW)
    expect(getTreeViewTabIndex('unknown-view')).to.equal(defaultIndex)
  })

  it('builds a shareable two-person connection path', () => {
    expect(getTreePath('connection', 'I0001', 'I0002')).to.equal(
      'tree/connection/I0001/I0002'
    )
  })
})
