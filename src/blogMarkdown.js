import {Marked} from 'marked'
import DOMPurify from 'dompurify'
import {baseDir, appUrl} from './appUrl.js'

const parser = new Marked({gfm: true, breaks: false})
export const MARKDOWN_NOTE_TYPE = 'Markdown'
export const isMarkdownNote = note => note?.type === MARKDOWN_NOTE_TYPE

export function markdownFragment(text) {
  return DOMPurify.sanitize(parser.parse(text || ''), {
    RETURN_DOM_FRAGMENT: true,
    ALLOWED_TAGS: [
      'p',
      'br',
      'hr',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'pre',
      'code',
      'strong',
      'b',
      'em',
      'i',
      's',
      'del',
      'u',
      'sub',
      'sup',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'a',
      'img',
      'details',
      'summary',
      'input',
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'title',
      'align',
      'start',
      'type',
      'checked',
      'disabled',
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
}

// Accept stable media page links; never attach credentials to arbitrary URLs.
export function internalMediaId(
  src,
  origin = window.location.origin,
  prefix = baseDir
) {
  if (/^\/?media\/[^/?#]+$/.test(src))
    return decodeURIComponent(src.split('/').at(-1))
  const url = new URL(src, `${origin}${appUrl('/', prefix)}`)
  if (url.origin !== origin) return null
  const match = url.pathname.match(
    new RegExp(
      `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/media/([^/]+)$`
    )
  )
  return match ? decodeURIComponent(match[1]) : null
}

export function markdownPreview(text) {
  return markdownFragment(text).textContent.replace(/\s+/g, ' ').trim()
}
