import {describe, expect, it, vi} from 'vitest'

import {GrampsjsAppBar} from '../../src/components/GrampsjsAppBar.js'

describe('app bar keyboard handling', () => {
  it('requests closing the active edit view on Escape', () => {
    const appBar = new GrampsjsAppBar()
    appBar.editMode = true
    const closeRequest = vi.spyOn(appBar, '_handleCloseRequest')
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true,
    })

    appBar._handleKeydown(event)

    expect(closeRequest).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).to.equal(true)
  })

  it('leaves Escape alone outside edit mode', () => {
    const appBar = new GrampsjsAppBar()
    const closeRequest = vi.spyOn(appBar, '_handleCloseRequest')
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true,
    })

    appBar._handleKeydown(event)

    expect(closeRequest).not.toHaveBeenCalled()
    expect(event.defaultPrevented).to.equal(false)
  })
})
