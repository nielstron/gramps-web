import {describe, expect, it, vi} from 'vitest'

vi.mock('../../src/appUrl.js', async importOriginal => ({
  ...(await importOriginal()),
  appUrl: path => `/stammbaum${path}`,
}))

const {GrampsjsObjectRevisions} = await import(
  '../../src/components/GrampsjsObjectRevisions.js'
)
const {GrampsjsNoteContent} = await import(
  '../../src/components/GrampsjsNoteContent.js'
)
const {GrampsjsViewDashboard} = await import(
  '../../src/views/GrampsjsViewDashboard.js'
)

describe('object revision links', () => {
  it('includes the configured application base path', () => {
    const revisions = new GrampsjsObjectRevisions()
    revisions.appState = {
      i18n: {lang: 'en', strings: {}},
    }

    const template = revisions._renderChange({
      transaction_id: 42,
      trans_type: 1,
      timestamp: 0,
    })

    expect(template.values).toContain('/stammbaum/revision/42')
  })

  it('reports the total number of revisions after loading', async () => {
    const revisions = new GrampsjsObjectRevisions()
    revisions.objClass = 'Event'
    revisions.handle = 'event-handle'
    revisions.appState = {
      apiGet: vi.fn().mockResolvedValue({data: [{}], total_count: '12'}),
      i18n: {lang: 'en', strings: {}},
    }
    const countHandler = vi.fn()
    revisions.addEventListener('revisions:count', countHandler)

    await revisions._fetchData()

    expect(countHandler).toHaveBeenCalledOnce()
    expect(countHandler.mock.calls[0][0].detail).toEqual({count: 12})
  })
})

describe('other internal links', () => {
  it('includes the application base path in the new-family dashboard link', () => {
    const dashboard = new GrampsjsViewDashboard()
    dashboard.appState = {
      dbInfo: {object_counts: {people: 1, families: 0}},
      i18n: {lang: 'en', strings: {}},
      permissions: {canEdit: true},
    }

    const template = dashboard._renderGetStarted()
    const buttons = template.values.find(value => value?.strings)?.values

    expect(buttons).toContain('/stammbaum/new_family')
  })

  it('rewrites rich-text object links for opening in a new tab', () => {
    const note = new GrampsjsNoteContent()
    const container = document.createElement('div')
    container.innerHTML = '<a href="/person/I0042">Person</a>'

    note._wireLinks(container)

    expect(container.querySelector('a').getAttribute('href')).toBe(
      '/stammbaum/person/I0042'
    )
  })
})
