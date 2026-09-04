import {describe, expect, it} from 'vitest'

import {appScopePath, appApiPathPattern} from '../../src/serviceWorkerPath.js'

describe('service-worker scoped paths', () => {
  it('resolves app files below a prefix scope', () => {
    const scope = 'https://misc.niels.bond/stammbaum/'
    expect(appScopePath(scope, 'config.js')).to.equal('/stammbaum/config.js')
    expect(appScopePath(scope)).to.equal('/stammbaum/')
  })

  it('recognizes API navigations below the prefix only', () => {
    const pattern = appApiPathPattern('https://misc.niels.bond/stammbaum/')
    expect(pattern.test('/stammbaum/api/people/')).to.equal(true)
    expect(pattern.test('/api/people/')).to.equal(false)
    expect(pattern.test('/stammbaum/person/I1500001')).to.equal(false)
  })

  it('keeps root-mounted behavior unchanged', () => {
    const pattern = appApiPathPattern('https://example.com/')
    expect(appScopePath('https://example.com/', 'config.js')).to.equal(
      '/config.js'
    )
    expect(pattern.test('/api/people/')).to.equal(true)
  })
})
