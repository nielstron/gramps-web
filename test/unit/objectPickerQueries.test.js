import {afterEach, describe, expect, it, vi} from 'vitest'

import {GrampsjsObjectPickerDialog} from '../../src/components/GrampsjsObjectPickerDialog.js'
import {objectSummariesUrl} from '../../src/objectPicker.js'
import {GrampsjsViewRecentObject} from '../../src/views/GrampsjsViewRecent.js'

afterEach(() => {
  delete window._oldSearchBackend
  vi.restoreAllMocks()
})

describe('compact object picker queries', () => {
  it('uses the compact recent-changes view for the default picker list', () => {
    const picker = new GrampsjsObjectPickerDialog()
    picker.objectType = 'person'
    picker.appState = {i18n: {lang: 'de'}}

    expect(picker._getFetchUrl('')).toBe(
      '/api/views/recent-changes?limit=20&type=person'
    )
  })

  it('uses compact summaries for typed picker searches', () => {
    const picker = new GrampsjsObjectPickerDialog()
    picker.objectType = 'person'
    picker.appState = {i18n: {lang: 'de'}}

    expect(picker._getFetchUrl('Niels')).toBe(
      '/api/search/?locale=de&summary=1&page=1&pagesize=20&query=Niels*&type=person'
    )
  })

  it('builds one typed batch request for handles and legacy Gramps IDs', () => {
    expect(
      objectSummariesUrl(
        [
          {className: 'Person', handle: 'person-handle'},
          {objectType: 'event', grampsId: 'E0001'},
        ],
        'de'
      )
    ).toBe(
      '/api/views/object-summaries?objects=person%3Aperson-handle%2Cevent%3AE0001&locale=de'
    )
  })

  it('loads the history page through the compact batch view', async () => {
    const apiGet = vi
      .fn()
      .mockResolvedValue({data: [{handle: 'person-handle'}]})
    const view = new GrampsjsViewRecentObject()
    view.appState = {apiGet}
    view._data = [
      {className: 'Person', handle: 'person-handle', grampsId: 'I0001'},
    ]

    await view._fetchData('de')

    expect(apiGet).toHaveBeenCalledWith(
      '/api/views/object-summaries?objects=person%3Aperson-handle&locale=de'
    )
    expect(view._searchResult).toEqual([{handle: 'person-handle'}])
  })
})
