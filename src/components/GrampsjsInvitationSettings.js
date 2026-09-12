import {html, css, LitElement} from 'lit'
import '@material/web/textfield/outlined-text-field.js'
import '@material/web/button/filled-button.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

export class GrampsjsInvitationSettings extends GrampsjsAppStateMixin(
  LitElement
) {
  static get properties() {
    return {
      treeName: {type: String},
      _subject: {state: true},
      _message: {state: true},
      _saving: {state: true},
    }
  }

  static get styles() {
    return css`
      :host {
        display: block;
        margin-top: 2em;
      }
      md-outlined-text-field {
        display: block;
        width: 100%;
        margin: 16px 0;
      }
      .preview {
        white-space: pre-wrap;
        border: 1px solid var(--md-sys-color-outline-variant);
        padding: 16px;
        margin: 16px 0;
      }
    `
  }

  constructor() {
    super()
    this.treeName = ''
    this._subject = null
    this._message = null
    this._saving = false
  }

  get subject() {
    return (
      this._subject ??
      this.appState.treeConfig?.['email.invitationSubject'] ??
      this._('You are invited to {tree_name}')
    )
  }

  get message() {
    return (
      this._message ??
      this.appState.treeConfig?.['email.invitationMessage'] ??
      this._(
        'You have been invited to join {tree_name}. Choose your username, full name, and password using the link below.'
      )
    )
  }

  _preview(text) {
    const values = {
      tree_name:
        this.appState.treeConfig?.['frontend.appTitle'] || this.treeName,
      invite_url: this._('Your personal invitation link'),
    }
    return text.replace(
      /\{(tree_name|invite_url)\}/g,
      (match, key) => values[key]
    )
  }

  render() {
    return html`<h3>${this._('Invitation email')}</h3>
      <p>
        ${this._(
          'Customize invitations for this family tree. Use {tree_name} for the tree name and {invite_url} for the personal link. The setup button and expiry notice are always included.'
        )}
      </p>
      <md-outlined-text-field
        label=${this._('Email subject')}
        .value=${this.subject}
        @input=${e => {
          this._subject = e.target.value
        }}
      ></md-outlined-text-field>
      <md-outlined-text-field
        type="textarea"
        rows="5"
        label=${this._('Email message')}
        .value=${this.message}
        @input=${e => {
          this._message = e.target.value
        }}
      ></md-outlined-text-field>
      <md-filled-button ?disabled=${this._saving} @click=${this._save}
        >${this._('Save')}</md-filled-button
      >
      <h4>${this._('Preview')}</h4>
      <div class="preview">
        <strong>${this._preview(this.subject)}</strong>
        <p>${this._preview(this.message)}</p>
        <p>${this._('This invitation expires in 7 days.')}</p>
        ${this._('Set up your account')} —
        ${this._('Your personal invitation link')}
      </div>`
  }

  async _save() {
    this._saving = true
    try {
      const result = await this.appState.updateTreeConfig({
        'email.invitationSubject': this.subject,
        'email.invitationMessage': this.message,
      })
      if ('error' in result)
        fireEvent(this, 'grampsjs:error', {message: result.error})
    } finally {
      this._saving = false
    }
  }
}
window.customElements.define(
  'grampsjs-invitation-settings',
  GrampsjsInvitationSettings
)
