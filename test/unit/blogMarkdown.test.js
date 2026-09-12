// @vitest-environment jsdom
import {describe, it, expect} from 'vitest'
import {
  markdownFragment,
  internalMediaId,
  markdownPreview,
  isMarkdownNote,
} from '../../src/blogMarkdown.js'

describe('blog Markdown', () => {
  it('renders GitHub tables, tasks, strikethrough and fenced code', () => {
    const fragment = markdownFragment(
      '| A | B |\n|---|---|\n| 1 | 2 |\n\n- [x] Done\n\n~~old~~\n\n```js\nconst x = 1\n```'
    )
    expect(fragment.querySelector('td').textContent).toBe('1')
    expect(fragment.querySelector('input').checked).toBe(true)
    expect(fragment.querySelector('input').disabled).toBe(true)
    expect(fragment.querySelector('del').textContent).toBe('old')
    expect(fragment.querySelector('pre code').textContent).toContain(
      'const x = 1'
    )
  })
  it('allows basic HTML but removes scripts, frames, handlers and unsafe URLs', () => {
    const fragment = markdownFragment(
      '<details><summary>More</summary><b>Text</b></details><script>alert(1)</script><iframe src="https://evil.test"></iframe><img src="media/O0001" onerror="alert(1)"><a href="javascript:alert(1)">bad</a>'
    )
    expect(fragment.querySelector('summary').textContent).toBe('More')
    expect(fragment.querySelector('script,iframe')).toBeNull()
    expect(fragment.querySelector('img').hasAttribute('onerror')).toBe(false)
    expect(fragment.querySelector('a').hasAttribute('href')).toBe(false)
  })
  it('recognizes stable internal media links at root and subpath only on our origin', () => {
    for (const src of [
      'media/O0001',
      '/media/O0001',
      '/stammbaum/media/O0001',
      'https://tree.test/stammbaum/media/O0001',
    ]) {
      expect(internalMediaId(src, 'https://tree.test', '/stammbaum')).toBe(
        'O0001'
      )
    }
    expect(
      internalMediaId(
        'https://evil.test/stammbaum/media/O0001',
        'https://tree.test',
        '/stammbaum'
      )
    ).toBeNull()
    expect(
      internalMediaId(
        'https://tree.test/api/media/abc/file',
        'https://tree.test',
        '/stammbaum'
      )
    ).toBeNull()
  })
  it('extracts readable excerpts and preserves legacy note format selection', () => {
    expect(markdownPreview('# Heading\n\n**Hello** ~~old~~')).toBe(
      'Heading Hello old'
    )
    expect(isMarkdownNote({type: 'Markdown'})).toBe(true)
    expect(isMarkdownNote({type: 'Source Note'})).toBe(false)
  })
})
