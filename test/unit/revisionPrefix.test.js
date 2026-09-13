import {describe, expect, it, vi} from 'vitest'

vi.mock('../../src/appUrl.js', async importOriginal => ({
  ...(await importOriginal()),
  appUrl: path => `/stammbaum${path}`,
}))

const {GrampsjsObjectRevisions} = await import(
  '../../src/components/GrampsjsObjectRevisions.js'
)

describe('object revision links under a deployment prefix', () => {
  it.each([
    'Person',
    'Event',
    'Family',
    'Place',
    'Source',
    'Citation',
    'Media',
    'Note',
  ])('preserves the prefix for %s history', objClass => {
    const revisions = new GrampsjsObjectRevisions()
    revisions.objClass = objClass
    revisions.appState = {i18n: {lang: 'en', strings: {}}}
    const template = revisions._renderChange({
      transaction_id: 42,
      trans_type: 1,
      timestamp: 0,
    })
    expect(template.values).toContain('/stammbaum/revision/42')
  })
})
