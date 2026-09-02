import {describe, expect, it} from 'vitest'

import {appUrl, baseDir} from '../../src/appUrl.js'

describe('appUrl', () => {
  it('uses the root when BASE_DIR is not set', () => {
    expect(baseDir).to.equal('')
    expect(appUrl('/new_person')).to.equal('/new_person')
  })

  it('prefixes shareable links with a configured base directory', () => {
    expect(appUrl('/register/my-tree', '/stammbaum')).to.equal(
      '/stammbaum/register/my-tree'
    )
  })
})
