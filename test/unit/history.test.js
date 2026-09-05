import {describe, expect, it} from 'vitest'

import {transactionHistoryUrl} from '../../src/history.js'

describe('transactionHistoryUrl', () => {
  it('omits empty filters', () => {
    expect(transactionHistoryUrl({page: 2, pageSize: 20})).toBe(
      '/api/transactions/history/?sort=-id&page=2&pagesize=20'
    )
  })

  it('trims and encodes history filters', () => {
    const url = transactionHistoryUrl({
      page: 1,
      pageSize: 20,
      search: '  birth place  ',
      editor: 'Ada Lovelace',
      person: 'Elisabeth Schüngel',
      objectClass: 'Person',
      transType: '1',
    })
    const parsed = new URL(url, 'https://example.test')
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      sort: '-id',
      page: '1',
      pagesize: '20',
      search: 'birth place',
      editor: 'Ada Lovelace',
      person: 'Elisabeth Schüngel',
      object_class: 'Person',
      trans_type: '1',
    })
  })
})
