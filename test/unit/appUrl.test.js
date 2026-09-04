import {describe, expect, it} from 'vitest'

import {appUrl, baseDir, parseAppPath} from '../../src/appUrl.js'

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

  it('parses a direct deep link below the configured base directory', () => {
    expect(
      parseAppPath('/stammbaum/person/I1500001', '/stammbaum')
    ).to.deep.equal({
      page: 'person',
      pageId: 'I1500001',
      pageId2: '',
      pageId3: '',
    })
  })

  it('decodes identifiers only after separating route segments', () => {
    expect(
      parseAppPath('/stammbaum/person/I%2F42', '/stammbaum')
    ).to.deep.equal({
      page: 'person',
      pageId: 'I/42',
      pageId2: '',
      pageId3: '',
    })
  })

  it('does not parse a path outside the configured base directory', () => {
    expect(parseAppPath('/other/person/I1500001', '/stammbaum')).to.equal(null)
  })
})
