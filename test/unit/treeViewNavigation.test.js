import {describe, expect, it} from 'vitest'

import '../../src/views/GrampsjsViewTree.js'

describe('tree view navigation', () => {
  it('navigates to a URL containing the selected graph and person', () => {
    const view = document.createElement('grampsjs-view-tree')
    view.active = true
    view.view = 'ancestor'
    view.grampsId = 'I0001'
    let navigation
    view.addEventListener('nav', event => {
      navigation = event.detail
    })

    view._selectPerson({detail: {grampsId: 'I0002'}})

    expect(navigation).toEqual({path: 'tree/ancestor/I0002'})
  })

  it('navigates to a URL containing the newly selected graph', () => {
    const view = document.createElement('grampsjs-view-tree')
    view.view = 'ancestor'
    view.grampsId = 'I0001'
    let navigation
    view.addEventListener('nav', event => {
      navigation = event.detail
    })

    view._handleTabChange({target: {activeTabIndex: 3}})

    expect(navigation).toEqual({path: 'tree/relationship/I0001'})
  })
})
