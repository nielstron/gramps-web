import {describe, expect, it, vi} from 'vitest'

import {
  getLoginReturnUrl,
  getLoginUrl,
  restoreLoginReturnPath,
} from '../../src/loginRedirect.js'

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

  it('restores the preserved path when authentication becomes ready on login', () => {
    const history = {replaceState: vi.fn()}
    const loadPage = vi.fn()
    const location = {
      origin,
      pathname: '/stammbaum/login',
      search:
        '?next=%2Fstammbaum%2Fperson%2FISCHLATTERANNELIESE%3Fsection%3Devents%23names',
      hash: '',
    }

    const destination = restoreLoginReturnPath({
      location,
      history,
      loadPage,
      configuredBaseDir: '/stammbaum',
    })

    expect(destination).toBe(
      '/stammbaum/person/ISCHLATTERANNELIESE?section=events#names'
    )
    expect(history.replaceState).toHaveBeenCalledWith({}, '', destination)
    expect(loadPage).toHaveBeenCalledWith(destination)
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
