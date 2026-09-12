import {it, expect} from 'vitest'
import {blogCoverHandle, withBlogCover} from '../../src/blogCover.js'

it('keeps a legacy cover, allows explicit replacement and removal without losing links', () => {
  const source = {
    media_list: [{ref: 'old'}, {ref: 'other'}],
    attribute_list: [{type: 'Unrelated', value: 'keep'}],
  }
  expect(blogCoverHandle(source)).toBe('old')
  const updated = withBlogCover(source, 'chosen')
  expect(blogCoverHandle(updated)).toBe('chosen')
  expect(updated.media_list.map(ref => ref.ref)).toEqual([
    'old',
    'other',
    'chosen',
  ])
  expect(updated.attribute_list[0]).toEqual({type: 'Unrelated', value: 'keep'})
  const removed = withBlogCover(updated, '')
  expect(blogCoverHandle(removed)).toBe('')
  expect(removed.media_list).toEqual(updated.media_list)
  expect(withBlogCover(updated, 'chosen').media_list).toHaveLength(3)
})
