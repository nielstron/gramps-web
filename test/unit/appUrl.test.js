import {describe, expect, it} from 'vitest'

import {appUrl, baseDir} from '../../src/appUrl.js'

describe('appUrl', () => {
  it('uses the root when BASE_DIR is not set', () => {
    expect(baseDir).to.equal('')
    expect(appUrl('/new_person')).to.equal('/new_person')
  })
})
