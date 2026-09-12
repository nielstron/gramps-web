import {html, LitElement} from 'lit'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {appUrl} from '../appUrl.js'

class GrampsjsBlogAuthor extends GrampsjsAppStateMixin(LitElement) {
  static get properties() {
    return {source: {type: Object}, _author: {state: true}}
  }

  constructor() {
    super()
    this.source = {}
    this._author = null
  }

  updated(changed) {
    if (changed.has('source')) {
      this._author = null
      const source = this.source
      if (
        !source.handle ||
        !source.attribute_list?.some(
          a => (a.type?.string || a.type) === 'Blog author'
        )
      )
        return
      this.appState
        .apiGet(`/api/sources/${source.handle}/author/`)
        .then(result => {
          if (this.source === source && result.data) this._author = result.data
        })
    }
  }

  render() {
    const author = this._author
    const name = author?.name || this.source.author || ''
    return author?.person_id
      ? html`<a
          style="color:inherit"
          title=${author.username}
          href=${appUrl(`/person/${encodeURIComponent(author.person_id)}`)}
          >${name}</a
        >`
      : html`<span title=${author?.username || ''}>${name}</span>`
  }
}
window.customElements.define('grampsjs-blog-author', GrampsjsBlogAuthor)
