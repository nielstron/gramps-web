import {html, css, LitElement} from 'lit'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {markdownFragment, internalMediaId} from '../blogMarkdown.js'
import {getMediaUrl} from '../api.js'
import {appUrl} from '../appUrl.js'

export class GrampsjsMarkdown extends GrampsjsAppStateMixin(LitElement) {
  static get properties() {
    return {content: {type: String}}
  }

  static get styles() {
    return css`
      :host {
        display: block;
        line-height: 1.7;
        overflow-wrap: anywhere;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      pre {
        overflow-x: auto;
        padding: 1em;
        background: var(--md-sys-color-surface-container);
      }
      table {
        border-collapse: collapse;
        display: block;
        overflow-x: auto;
      }
      th,
      td {
        border: 1px solid var(--md-sys-color-outline-variant);
        padding: 0.4em 0.8em;
      }
      blockquote {
        border-left: 3px solid var(--md-sys-color-outline);
        padding-left: 1em;
        margin-left: 0;
      }
      a {
        color: var(--md-sys-color-primary);
      }
    `
  }

  constructor() {
    super()
    this.content = ''
    this._refresh = () => this.requestUpdate('content')
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('token:refreshed', this._refresh)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('token:refreshed', this._refresh)
  }

  render() {
    return html`<div id="content"></div>`
  }

  updated(changed) {
    if (!changed.has('content') && !changed.has('appState')) return
    const fragment = markdownFragment(this.content)
    const pending = []
    for (const input of fragment.querySelectorAll('input')) {
      input.type = 'checkbox'
      input.disabled = true
    }
    for (const link of fragment.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href')
      const objectLink = href.match(
        /^\/?(person|event|family|place|source|citation|repository|note)\/([^/?#]+)$/
      )
      const id = internalMediaId(href)
      if (objectLink) link.href = appUrl(`/${objectLink[1]}/${objectLink[2]}`)
      else if (id) link.href = appUrl(`/media/${encodeURIComponent(id)}`)
    }
    for (const img of fragment.querySelectorAll('img[src]')) {
      const id = internalMediaId(img.getAttribute('src'))
      img.referrerPolicy = 'no-referrer'
      if (id) {
        if (!img.closest('a')) {
          const link = document.createElement('a')
          link.href = appUrl(`/media/${encodeURIComponent(id)}`)
          img.replaceWith(link)
          link.append(img)
        }
        img.removeAttribute('src')
        pending.push([img, id])
      }
    }
    this.shadowRoot.getElementById('content').replaceChildren(fragment)
    // The API enforces access to each image; saved Markdown contains no tokens.
    const requests = new Map()
    for (const [img, id] of pending) {
      if (!requests.has(id))
        requests.set(
          id,
          this.appState.apiGet(
            `/api/media/?gramps_id=${encodeURIComponent(id)}`
          )
        )
      requests.get(id).then(result => {
        if (result.data?.[0]) img.src = getMediaUrl(result.data[0].handle)
        else img.alt = `${img.alt || id} (${this._('Media unavailable')})`
      })
    }
  }
}
window.customElements.define('grampsjs-markdown', GrampsjsMarkdown)
