import {describe, expect, it} from 'vitest'

import {getLoginReturnUrl, getLoginUrl} from '../../src/loginRedirect.js'

const origin = 'https://misc.niels.bond'

describe('login deep-link redirects', () => {
  it('puts the complete requested path into the login URL', () => {
    expect(
      getLoginUrl(
        {
          origin,
          pathname: '/stammbaum/person/ISCHLATTERANNELIESE',
          search: '?section=events',
          hash: '#names',
        },
        '/stammbaum'
      )
    ).toBe(
      '/stammbaum/login?next=%2Fstammbaum%2Fperson%2FISCHLATTERANNELIESE%3Fsection%3Devents%23names'
    )
  })

  it('returns to the preserved person path after login', () => {
    expect(
      getLoginReturnUrl(
        {
          origin,
          search:
            '?next=%2Fstammbaum%2Fperson%2FISCHLATTERANNELIESE%3Fsection%3Devents%23names',
        },
        '/stammbaum'
      )
    ).toBe('/stammbaum/person/ISCHLATTERANNELIESE?section=events#names')
  })

  it('rejects external and out-of-app return paths', () => {
    expect(
      getLoginReturnUrl(
        {origin, search: '?next=https%3A%2F%2Fevil.example%2F'},
        '/stammbaum'
      )
    ).toBe('/stammbaum/')
    expect(
      getLoginReturnUrl({origin, search: '?next=%2Fadmin'}, '/stammbaum')
    ).toBe('/stammbaum/')
  })
})
