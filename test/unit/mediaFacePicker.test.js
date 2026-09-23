import {expect, it, vi} from 'vitest'
import {render} from 'lit'
import {GrampsjsMediaObject} from '../../src/components/GrampsjsMediaObject.js'

it('finds the same person again when tagging another photo', async () => {
  const media = new GrampsjsMediaObject()
  media.appState = {i18n: {lang: 'en', strings: {}}, permissions: {}}
  media.data = {handle: 'photo-one', mime: 'image/jpeg'}
  media.selectedRect = {rect: [10, 20, 30, 40]}
  const container = document.createElement('div')
  render(media._renderImageEdit(), container, {host: media})
  const selector = container.querySelector('grampsjs-form-select-object')
  const marie = {
    handle: 'marie',
    object_type: 'person',
    object: {handle: 'marie'},
  }
  const tagged = vi.fn()
  media.addEventListener('facetag:add', tagged)
  selector._selectObject(marie)
  expect(tagged).toHaveBeenCalledOnce()
  expect(tagged.mock.calls[0][0].detail.personHandle).toBe('marie')

  media.data = {...media.data, handle: 'photo-two'}
  render(media._renderImageEdit(), container, {host: media})
  const reusedSelector = container.querySelector('grampsjs-form-select-object')
  expect(reusedSelector).toBe(selector)
  const Picker = customElements.get('grampsjs-object-picker-dialog')
  const picker = new Picker()
  picker.appState = {
    i18n: {lang: 'en'},
    apiGet: vi.fn().mockResolvedValue({data: [marie]}),
  }
  picker.excludeHandles = reusedSelector._handleList()
  picker.objectType = 'person'
  await picker._fetchSearchData('Marie Merck', picker._fetchId)
  expect(picker._data).toEqual([marie])
})
