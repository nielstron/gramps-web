import {html, css, LitElement} from 'lit'
import '@github/markdown-toolbar-element'
import '@material/web/tabs/tabs.js'
import '@material/web/tabs/primary-tab.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/button/text-button.js'
import {live} from 'lit/directives/live.js'
import {
  mdiFormatBold,
  mdiFormatItalic,
  mdiFormatStrikethrough,
  mdiFormatHeader2,
  mdiFormatQuoteClose,
  mdiCodeTags,
  mdiLink,
  mdiFormatListBulleted,
  mdiFormatListNumbered,
  mdiFormatListChecks,
  mdiImagePlus,
  mdiAccountPlus,
  mdiCalendarPlus,
  mdiEyeOffOutline,
} from '@mdi/js'
import './GrampsjsIcon.js'
import './GrampsjsFormSelectObject.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, personDisplayName, eventTitleFromProfile} from '../util.js'
import {saveDraft, getDraft, clearDraftsWithPrefix} from '../api.js'
import './GrampsjsMarkdown.js'

export class GrampsjsMarkdownEditor extends GrampsjsAppStateMixin(LitElement) {
  static get properties() {
    return {
      initialData: {type: Object},
      data: {state: true},
      _tab: {state: true},
    }
  }

  static get styles() {
    return css`
      .editor {
        border: 1px solid var(--md-sys-color-outline);
        border-radius: 8px;
        overflow: hidden;
      }
      md-tabs {
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
      }
      markdown-toolbar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 2px;
        padding: 6px 12px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
      }
      textarea,
      .preview {
        display: block;
        width: 100%;
        height: 24rem;
        box-sizing: border-box;
        padding: 16px;
        margin: 0;
        overflow: auto;
        background: var(--md-sys-color-surface);
        color: var(--md-sys-color-on-surface);
      }
      textarea {
        border: 0;
        resize: none;
        font: 15px/1.6 monospace;
        outline-offset: -2px;
      }
      .preview {
        font-size: 17px;
        line-height: 1.7;
      }
      [hidden] {
        display: none !important;
      }
      .help {
        font-size: 0.9em;
        color: var(--md-sys-color-on-surface-variant);
      }
    `
  }

  constructor() {
    super()
    this.initialData = {_class: 'StyledText', string: '', tags: []}
    this.data = this.initialData
    this._tab = 0
    this._selection = [0, 0]
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

  _wrapSelection(prefix, suffix, fallback = '') {
    const field = this.shadowRoot.getElementById('markdown-input')
    const start = field.selectionStart
    const end = field.selectionEnd
    const text = field.value.slice(start, end) || fallback
    field.setRangeText(`${prefix}${text}${suffix}`, start, end, 'end')
    field.focus()
    field.setSelectionRange(
      start + prefix.length,
      start + prefix.length + text.length
    )
    this._input({target: field})
  }

  _openPicker(type) {
    const field = this.shadowRoot.getElementById('markdown-input')
    this._selection = [field.selectionStart, field.selectionEnd]
    this.shadowRoot.querySelector(`#picker-${type}`).open()
  }

  async _insertObject(event, type) {
    event.stopPropagation()
    const selected = event.detail.objects[0]
    const handle = selected.handle ?? selected.object?.handle
    const endpoint = {media: 'media', person: 'people', event: 'events'}[type]
    const result = await this.appState.apiGet(
      `/api/${endpoint}/${handle}?profile=all`
    )
    if ('error' in result) {
      fireEvent(this, 'grampsjs:error', {message: result.error})
      return
    }
    const media = result.data
    const field = this.shadowRoot.getElementById('markdown-input')
    field.setSelectionRange(...this._selection)
    const title =
      type === 'person'
        ? personDisplayName(media)
        : type === 'event'
        ? media.description ||
          eventTitleFromProfile(media.profile || {}) ||
          this._('Event')
        : media.desc || this._('Media')
    this._wrapSelection(
      type === 'media' && media.mime.startsWith('image/') ? '![' : '[',
      `](${type}/${encodeURIComponent(media.gramps_id)})`,
      title.replace(/[\\[\]]/g, '\\$&')
    )
  }

  _shortcut(event) {
    if (
      !(event.metaKey || event.ctrlKey) ||
      !['b', 'i'].includes(event.key.toLowerCase())
    )
      return
    event.preventDefault()
    this.shadowRoot
      .querySelector(
        `[data-md-button="${
          event.key.toLowerCase() === 'b' ? 'bold' : 'italic'
        }"]`
      )
      .click()
  }

  render() {
    const tools = [
      ['bold', 'Bold', mdiFormatBold],
      ['italic', 'Italic', mdiFormatItalic],
      ['strikethrough', 'Strikethrough', mdiFormatStrikethrough],
      ['header-2', 'Heading', mdiFormatHeader2],
      ['quote', 'Quote', mdiFormatQuoteClose],
      ['code', 'Code', mdiCodeTags],
      ['link', 'Link', mdiLink],
      ['unordered-list', 'Bulleted list', mdiFormatListBulleted],
      ['ordered-list', 'Numbered list', mdiFormatListNumbered],
      ['task-list', 'Task list', mdiFormatListChecks],
    ]
    return html`<div class="editor">
        <md-tabs
          .activeTabIndex=${this._tab}
          @change=${e => {
            this._tab = e.target.activeTabIndex
          }}
        >
          <md-primary-tab id="write-tab" aria-controls="write-panel"
            >${this._('Write')}</md-primary-tab
          >
          <md-primary-tab id="preview-tab" aria-controls="preview-panel"
            >${this._('Preview')}</md-primary-tab
          >
        </md-tabs>
        <markdown-toolbar
          for="markdown-input"
          aria-label=${this._('Formatting')}
        >
          ${tools.map(
            ([action, label, icon]) =>
              html`<md-icon-button
                data-md-button=${action}
                aria-label=${this._(label)}
                title=${this._(label)}
                ?disabled=${this._tab === 1}
                ><grampsjs-icon path=${icon}></grampsjs-icon
              ></md-icon-button>`
          )}
          <md-icon-button
            data-md-button="spoiler"
            aria-label=${this._('Spoiler')}
            title=${this._('Spoiler')}
            ?disabled=${this._tab === 1}
            @click=${() =>
              this._wrapSelection(
                '<details>\n<summary>' + this._('Spoiler') + '</summary>\n\n',
                '\n\n</details>',
                this._('Hidden text')
              )}
            ><grampsjs-icon path=${mdiEyeOffOutline}></grampsjs-icon
          ></md-icon-button>
          <md-text-button
            data-md-button="code-block"
            ?disabled=${this._tab === 1}
            @click=${() =>
              this._wrapSelection(
                '\n\x60\x60\x60\n',
                '\n\x60\x60\x60\n',
                this._('Code')
              )}
            >${this._('Code block')}</md-text-button
          >
          <md-text-button
            data-md-button="media"
            ?disabled=${this._tab === 1}
            @click=${() => this._openPicker('media')}
            ><grampsjs-icon slot="icon" path=${mdiImagePlus}></grampsjs-icon
            >${this._('Insert media')}</md-text-button
          >
          ${[
            ['person', 'Insert person', mdiAccountPlus],
            ['event', 'Insert event', mdiCalendarPlus],
          ].map(
            ([type, label, icon]) => html`<md-text-button
              ?disabled=${this._tab === 1}
              @click=${() => this._openPicker(type)}
              ><grampsjs-icon slot="icon" path=${icon}></grampsjs-icon>${this._(
                label
              )}</md-text-button
            >`
          )}
        </markdown-toolbar>
        <div
          id="write-panel"
          role="tabpanel"
          aria-labelledby="write-tab"
          ?hidden=${this._tab !== 0}
        >
          <textarea
            id="markdown-input"
            aria-label="Markdown"
            .value=${live(this.data.string)}
            @input=${this._input}
            @keydown=${this._shortcut}
          ></textarea>
        </div>
        <div
          id="preview-panel"
          class="preview"
          role="tabpanel"
          aria-labelledby="preview-tab"
          ?hidden=${this._tab !== 1}
        >
          ${this._tab === 1
            ? html`<grampsjs-markdown
                .appState=${this.appState}
                .content=${this.data.string}
              ></grampsjs-markdown>`
            : ''}
        </div>
      </div>
      <p class="help">
        ${this._(
          'Use the formatting buttons or write GitHub Flavored Markdown directly.'
        )}
      </p>
      ${['media', 'person', 'event'].map(
        type => html`<grampsjs-form-select-object
          id=${`picker-${type}`}
          hideButton
          objectType=${type}
          .appState=${this.appState}
          @select-object:changed=${event => this._insertObject(event, type)}
        ></grampsjs-form-select-object>`
      )}`
  }
}
window.customElements.define('grampsjs-markdown-editor', GrampsjsMarkdownEditor)
