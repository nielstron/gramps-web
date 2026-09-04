import {describe, expect, it} from 'vitest'

import {getInitialAppState} from '../../src/appState.js'

describe('initial application route', () => {
  it('starts on the browser deep link before metadata can render another view', () => {
    expect(getInitialAppState('/person/I0033').path).toEqual({
      page: 'person',
      pageId: 'I0033',
      pageId2: '',
      pageId3: '',
    })
  })
})
