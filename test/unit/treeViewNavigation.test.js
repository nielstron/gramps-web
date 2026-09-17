import {describe, expect, it, vi} from 'vitest'

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
    view.active = true
    view.appState = {path: {page: 'tree'}}
    view.view = 'ancestor'
    view.grampsId = 'I0001'
    let navigation
    view.addEventListener('nav', event => {
      navigation = event.detail
    })

    view._handleTabChange({target: {activeTabIndex: 3}})

    expect(navigation).toEqual({path: 'tree/relationship/I0001'})
  })

  it('preserves both endpoints when selecting the connection graph', () => {
    const view = document.createElement('grampsjs-view-tree')
    view.active = true
    view.appState = {path: {page: 'tree'}}
    view.view = 'relationship'
    view.grampsId = 'I0001'
    view.targetGrampsId = 'I0002'
    let navigation
    view.addEventListener('nav', event => {
      navigation = event.detail
    })

    view._handleTabChange({target: {activeTabIndex: 5}})

    expect(navigation).toEqual({path: 'tree/connection/I0001/I0002'})
  })

  it('persists and immediately opens a newly selected home person', async () => {
    const view = document.createElement('grampsjs-view-tree')
    view.active = true
    view.view = 'relationship'
    view.appState = {
      updateUserSettings: vi.fn().mockResolvedValue({
        data: {homePerson: 'I0042'},
      }),
    }
    const navigation = []
    view.addEventListener('nav', event => navigation.push(event.detail))
    const event = {
      detail: {objects: [{object: {gramps_id: 'I0042'}}]},
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    }

    await view._handleHomePerson(event)

    expect(view.appState.updateUserSettings).toHaveBeenCalledWith({
      homePerson: 'I0042',
    })
    expect(navigation).toEqual([
      {
        path: 'tree/relationship/I0042',
        replaceHistory: true,
      },
    ])
  })

  it.each([false, true])(
    'ignores tab changes after profile navigation even when active is still %s',
    active => {
      const view = document.createElement('grampsjs-view-tree')
      view.active = active
      view.appState = {path: {page: 'person', pageId: 'I0002'}}
      view.grampsId = 'I0001'
      const navigation = []
      view.addEventListener('nav', event => navigation.push(event.detail))

      view._handleTabChange({target: {activeTabIndex: 3}})

      expect(navigation).toEqual([])
    }
  )

  it('stops reacting to global person selections after it is disconnected', () => {
    const view = document.createElement('grampsjs-view-tree')
    view.active = false
    view.view = 'relationship'
    view.grampsId = 'I0001'
    view.appState = {i18n: {lang: 'en', strings: {}}}
    view.renderContent = () => ''
    let navigation
    view.addEventListener('nav', event => {
      navigation = event.detail
    })
    document.body.append(view)
    view.remove()
    view.active = true

    window.dispatchEvent(
      new CustomEvent('pedigree:person-selected', {
        detail: {grampsId: 'I0002'},
      })
    )

    expect(navigation).toBeUndefined()
  })
})
