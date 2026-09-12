import {html, css, LitElement} from 'lit'
import '@material/web/switch/switch.js'
import '@material/web/textfield/outlined-text-field.js'
import '@material/web/button/filled-button.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

export class GrampsjsAiSettings extends GrampsjsAppStateMixin(LitElement) {
  static get properties() {
    return {
      _settings: {state: true},
      _saving: {state: true},
      _saved: {state: true},
      _keys: {state: true},
      _clear: {state: true},
    }
  }

  static get styles() {
    return css`
      .fields {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 16px;
      }
      md-outlined-text-field {
        width: 100%;
      }
      label {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 16px 0;
      }
      h3 {
        margin-top: 24px;
      }
    `
  }

  constructor() {
    super()
    this._settings = null
    this._saving = false
    this._saved = false
    this._keys = {chat_api_key: '', embedding_api_key: ''}
    this._clear = {chat_api_key: false, embedding_api_key: false}
  }

  async firstUpdated() {
    const result = await this.appState.apiGet('/api/config/ai/')
    if ('error' in result)
      fireEvent(this, 'grampsjs:error', {message: result.error})
    else this._settings = result.data
  }

  _field(key, label, placeholder = '') {
    return html`<md-outlined-text-field
      label=${this._(label)}
      placeholder=${placeholder}
      .value=${this._settings[key]}
      ?disabled=${this._saving}
      @input=${e => {
        this._settings = {...this._settings, [key]: e.target.value}
        this._saved = false
      }}
    ></md-outlined-text-field>`
  }

  _keyField(key) {
    return html`<div>
      <md-outlined-text-field
        type="password"
        autocomplete="new-password"
        label=${this._('API key')}
        .value=${this._keys[key]}
        ?disabled=${this._saving || this._clear[key]}
        .supportingText=${this._settings[`${key}_set`]
          ? this._('A key is stored. Leave blank to keep it.')
          : this._(
              'Optional for providers that do not require authentication.'
            )}
        @input=${e => {
          this._keys = {...this._keys, [key]: e.target.value}
          this._saved = false
        }}
      ></md-outlined-text-field>
      ${this._settings[`${key}_set`]
        ? html`<label
            ><md-switch
              .selected=${this._clear[key]}
              ?disabled=${this._saving}
              @change=${e => {
                this._clear = {...this._clear, [key]: e.target.selected}
              }}
            ></md-switch
            >${this._('Remove stored key')}</label
          >`
        : ''}
    </div>`
  }

  render() {
    if (!this._settings) return html`<p>${this._('Loading...')}</p>`
    return html`<p>
        ${this._(
          'These settings apply to all family trees on this server. Changes take effect without a restart.'
        )}
      </p>
      <label
        ><md-switch
          .selected=${this._settings.enabled}
          ?disabled=${this._saving}
          @change=${e => {
            this._settings = {...this._settings, enabled: e.target.selected}
            this._saved = false
          }}
        ></md-switch
        >${this._('Enable AI assistant')}</label
      >
      <h3>${this._('Chat model')}</h3>
      <p>
        ${this._(
          'Use OpenAI or an OpenAI-compatible provider such as Ollama. Leave the chat API URL blank for OpenAI.'
        )}
      </p>
      <div class="fields">
        ${this._field(
          'chat_model',
          'Model name',
          'gpt-4o-mini / qwen3:8b'
        )}${this._field(
          'chat_base_url',
          'Chat API URL',
          'http://ollama:11434/v1'
        )}${this._keyField('chat_api_key')}
      </div>
      <h3>${this._('Embedding model')}</h3>
      <p>
        ${this._(
          'Embeddings find relevant family records. Enter a remote API URL, or leave it blank to run a Sentence Transformers model on this server.'
        )}
      </p>
      <div class="fields">
        ${this._field(
          'embedding_model',
          'Model name',
          'text-embedding-3-small'
        )}${this._field(
          'embedding_base_url',
          'Embedding API URL',
          'https://api.openai.com'
        )}${this._keyField('embedding_api_key')}
      </div>
      <p>
        ${this._(
          'Hosted providers receive the records used for indexing and answers. Local providers keep this processing on your infrastructure.'
        )}
      </p>
      <md-filled-button ?disabled=${this._saving} @click=${this._save}
        >${this._('Save')}</md-filled-button
      >
      ${this._saved
        ? html`<p role="status">
            ${this._(
              'AI settings saved. After changing the embedding model or provider, regenerate the semantic search index below for each tree. Choose allowed user groups under Manage users.'
            )}
          </p>`
        : ''}`
  }

  async _save() {
    this._saving = true
    const payload = {...this._settings}
    delete payload.chat_api_key_set
    delete payload.embedding_api_key_set
    for (const key of ['chat_api_key', 'embedding_api_key'])
      payload[key] = this._clear[key] ? '' : this._keys[key] || null
    try {
      const result = await this.appState.apiPut('/api/config/ai/', payload)
      if ('error' in result)
        fireEvent(this, 'grampsjs:error', {message: result.error})
      else {
        this._settings = result.data
        this._keys = {chat_api_key: '', embedding_api_key: ''}
        this._clear = {chat_api_key: false, embedding_api_key: false}
        this._saved = true
      }
    } finally {
      this._saving = false
    }
  }
}
window.customElements.define('grampsjs-ai-settings', GrampsjsAiSettings)
