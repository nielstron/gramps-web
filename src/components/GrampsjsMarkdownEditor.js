import {html, css, LitElement} from 'lit'
import '@material/web/textfield/outlined-text-field.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import {saveDraft, getDraft, clearDraftsWithPrefix} from '../api.js'
import './GrampsjsMarkdown.js'

export class GrampsjsMarkdownEditor extends GrampsjsAppStateMixin(LitElement) {
  static get properties() {
    return {initialData: {type: Object}, data: {state: true}}
  }

  static get styles() {
    return css`
      md-outlined-text-field {
        width: 100%;
      }
      details {
        margin: 16px 0;
      }
      summary {
        cursor: pointer;
      }
    `
  }

  constructor() {
    super()
    this.initialData = {_class: 'StyledText', string: '', tags: []}
    this.data = this.initialData
    this._save = () => {
      fireEvent(this, 'edit:action', {
        action: 'updateProp',
        data: {text: this.data},
        editorDraftPrefix: this._prefix(),
      })
      fireEvent(this, 'edit-mode:off')
    }
    this._cancel = () => clearDraftsWithPrefix(this._prefix())
  }

  _prefix() {
    const {page = '', pageId = ''} = this.appState.path || {}
    return `${page}:${pageId}:`
  }

  _key() {
    return `${this._prefix()}${this.id}`
  }

  firstUpdated() {
    this.data = getDraft(this._key())?.data || this.initialData
    if (this.data !== this.initialData) this._emit()
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('edit-mode:save', this._save)
    window.addEventListener('edit:cancel', this._cancel)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('edit-mode:save', this._save)
    window.removeEventListener('edit:cancel', this._cancel)
  }

  reset() {
    this.data = this.initialData
  }

  _emit() {
    fireEvent(this, 'formdata:changed', {
      data: this.data,
      storageKeyPrefix: this._prefix(),
    })
  }

  _input(event) {
    this.data = {_class: 'StyledText', string: event.target.value, tags: []}
    saveDraft(this._key(), this.data)
    this._emit()
  }

  render() {
    return html`<p>
        ${this._(
          'GitHub Flavored Markdown with basic HTML. Embed an internal image with'
        )} <code>![Caption](media/O0001)</code>.
      </p>
      <md-outlined-text-field
        type="textarea"
        rows="14"
        label="Markdown"
        .value=${this.data.string}
        @input=${this._input}
      ></md-outlined-text-field>
      <details>
        <summary>${this._('Preview')}</summary>
        <grampsjs-markdown
          .appState=${this.appState}
          .content=${this.data.string}
        ></grampsjs-markdown>
      </details>`
  }
}
window.customElements.define('grampsjs-markdown-editor', GrampsjsMarkdownEditor)
