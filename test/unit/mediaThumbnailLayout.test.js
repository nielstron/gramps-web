import {describe, expect, it} from 'vitest'
import {render} from 'lit'
import {GrampsjsViewMediaObjects} from '../../src/views/GrampsjsViewMediaObjects.js'
import '../../src/components/GrampsjsImg.js'

describe('media list thumbnail sizing', () => {
  for (const method of ['_renderTile', '_renderMediaListItem']) {
    it(`${method} fills its fixed frame even for undersized high-DPI thumbnails`, () => {
      const view = new GrampsjsViewMediaObjects()
      view.appState = {i18n: {lang: 'en', strings: {}}, settings: {}}
      const container = document.createElement('div')
      render(
        view[method]({
          handle: 'small',
          gramps_id: 'O0849',
          mime: 'image/png',
          change: 1,
        }),
        container
      )
      const img = container.querySelector('grampsjs-img')
      expect(img.hasAttribute('cover')).toBe(true)
      expect(img.hasAttribute('square')).toBe(true)
    })
  }
})
