import {describe, expect, it, vi} from 'vitest'
import {GrampsjsViewBlog} from '../../src/views/GrampsjsViewBlog.js'
import {GrampsjsViewRecentBlogPosts} from '../../src/views/GrampsjsViewRecentBlogPosts.js'
import {blogPublicationTimestamp} from '../../src/blogPublication.js'

describe('blog publication ordering', () => {
  it('displays publication time independently of last modification', () => {
    const post = {
      change: 9999999999,
      attribute_list: [
        {type: 'Blog publication date', value: '2026-09-12T13:13:51Z'},
      ],
    }
    expect(blogPublicationTimestamp(post)).toBe(
      Date.parse('2026-09-12T13:13:51Z') / 1000
    )
    expect(blogPublicationTimestamp({change: 9999999999})).toBeUndefined()
  })
  it('orders the paginated blog by publication rather than modification', async () => {
    const view = new GrampsjsViewBlog()
    view.appState = {
      permissions: {canAdd: false},
      i18n: {lang: 'en'},
      apiGet: vi.fn().mockResolvedValue({data: [], total_count: 0}),
    }
    await view._fetchData()
    expect(view.appState.apiGet.mock.calls[0][0]).toContain('sort=-publication')
  })
  it('uses publication ordering for the dashboard latest post', () => {
    const view = new GrampsjsViewRecentBlogPosts()
    view.appState = {i18n: {lang: 'en'}}
    expect(view.getUrl()).toContain('sort=-publication')
  })
})
