import {describe, expect, it, vi} from 'vitest'

import {GrampsjsViewSettingsUser} from '../../src/views/GrampsjsViewSettingsUser.js'

const API_KEYS_ENDPOINT = '/api/users/-/api-keys/'

function createView({apiGet, apiPost, apiDelete} = {}) {
  const view = new GrampsjsViewSettingsUser()
  view.appState = {
    i18n: {strings: {}},
    settings: {},
    permissions: {},
    dbInfo: {gramps_webapi: {version: '3.21.1'}},
    apiGet: apiGet || vi.fn().mockResolvedValue({data: []}),
    apiPost: apiPost || vi.fn(),
    apiDelete: apiDelete || vi.fn(),
  }
  return view
}

function templateMarkup(value) {
  if (Array.isArray(value)) {
    return value.map(templateMarkup).join('')
  }
  if (value && Array.isArray(value.strings)) {
    return value.strings.reduce(
      (markup, string, index) =>
        `${markup}${string}${templateMarkup(value.values[index])}`,
      ''
    )
  }
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}

describe('full API keys in developer tools', () => {
  it('loads and renders key metadata without exposing credentials', async () => {
    const apiGet = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'key-1',
          name: 'Tree maintenance',
          fingerprint: 'abc123def456',
          created_at: '2026-09-03T12:00:00',
          expires_at: '2027-09-04T00:00:00',
          expires_on: '2027-09-03',
        },
      ],
    })
    const view = createView({apiGet})

    await view._loadApiKeys()
    const content = templateMarkup(view.renderApiToken())

    expect(apiGet).toHaveBeenCalledWith(API_KEYS_ENDPOINT)
    expect(content).to.contain('Tree maintenance')
    expect(content).to.contain('abc123def456')
  })

  it('creates a named key with an explicit expiry date', async () => {
    const apiPost = vi.fn().mockResolvedValue({
      data: {
        api_key: {
          id: 'key-1',
          name: 'Tree maintenance',
          fingerprint: 'abc123def456',
          created_at: '2026-09-03T12:00:00',
          expires_at: '2027-09-04T00:00:00',
          expires_on: '2027-09-03',
        },
        token: 'one-time-secret',
      },
    })
    const view = createView({apiPost})
    await view._createApiKey('Tree maintenance', '2027-09-03')

    expect(apiPost).toHaveBeenCalledWith(
      API_KEYS_ENDPOINT,
      {name: 'Tree maintenance', expires_on: '2027-09-03'},
      {dbChanged: false}
    )
    expect(view._newApiKeyToken).to.equal('one-time-secret')
    expect(view._apiKeys).to.have.length(1)
  })

  it('revokes a key by id', async () => {
    const apiDelete = vi.fn().mockResolvedValue({data: undefined})
    const view = createView({apiDelete})
    view._apiKeys = [{id: 'key-1', name: 'Tree maintenance'}]

    await view._revokeApiKey('key-1')

    expect(apiDelete).toHaveBeenCalledWith(`${API_KEYS_ENDPOINT}key-1/`, {
      dbChanged: false,
    })
    expect(view._apiKeys).to.deep.equal([])
  })
})
