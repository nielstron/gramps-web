import {html, css} from 'lit'

import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import '@material/web/button/filled-button.js'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
import '@material/web/textfield/filled-text-field.js'
import '@material/web/iconbutton/icon-button.js'

import {
  mdiAccountMultiplePlus,
  mdiAccountPlus,
  mdiDeleteForever,
  mdiDownload,
  mdiFilterOff,
  mdiLockReset,
  mdiEmailArrowRight,
  mdiPencil,
} from '@mdi/js'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import {userRoles} from './GrampsjsFormUser.js'
import {fireEvent} from '../util.js'

import './GrampsjsTooltip.js'
import './GrampsjsIcon.js'

const ALL_ROLES = '__all__'

export class GrampsjsUsers extends GrampsjsTableBase {
  static get styles() {
    return [
      super.styles,
      css`
        .filter-bar {
          display: flex;
          flex-wrap: wrap;
          flex-direction: row;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          margin-bottom: 4px;
        }

        md-filled-text-field {
          flex: 1 1 200px;
          min-width: 140px;
        }

        md-filled-select {
          flex: 0 1 160px;
          min-width: 130px;
        }

        .clear-filters {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 4px 0;
          color: var(--mdc-theme-secondary);
        }

        .clear-filters:hover {
          text-decoration: underline;
        }

        .user-actions {
          white-space: nowrap;
        }
        .invite-fields {
          display: grid;
          gap: 20px;
          min-width: 260px;
        }
        .invite-fields md-filled-text-field,
        .invite-fields md-filled-select {
          width: 100%;
        }
        .invite-error {
          color: var(--grampsjs-alert-error-font-color);
        }
      `,
    ]
  }

  static get properties() {
    return {
      dialogContent: {type: String},
      ismulti: {type: Boolean},
      _downloadUrl: {type: String},
      _userData: {type: Array},
      _filterText: {type: String},
      _filterRole: {type: String},
      invitations: {type: Array},
      busy: {type: Boolean},
      invitationError: {type: String},
    }
  }

  constructor() {
    super()
    this.dialogContent = ''
    this.ismulti = false
    this._downloadUrl = ''
    this._userData = []
    this._filterText = ''
    this._filterRole = ALL_ROLES
    this.invitations = []
    this.busy = false
    this.invitationError = ''
  }

  get _filteredData() {
    const text = this._filterText.toLowerCase()
    return this.data.filter(obj => {
      const matchesText =
        !text ||
        (obj.name || '').toLowerCase().includes(text) ||
        (obj.full_name || '').toLowerCase().includes(text) ||
        (obj.email || '').toLowerCase().includes(text)
      const matchesRole =
        this._filterRole === ALL_ROLES || String(obj.role) === this._filterRole
      return matchesText && matchesRole
    })
  }

  render() {
    const filtered = this._filteredData
    return html`
      ${this._renderButtons()} ${this._renderFilterBar()}
      <table>
        <tr>
          <th>${this._('Username: ').replace(':', '')}</th>
          <th>${this._('Full Name')}</th>
          <th>${this._('E-mail')}</th>
          <th>${this._('Role')}</th>
          <th>${this._('Account Source')}</th>
          <th></th>
        </tr>
        ${filtered.map(
          (obj, index) => html`
            <tr>
              <td>${obj.name}</td>
              <td>${obj.full_name}</td>
              <td>${obj.email}</td>
              <td>${this._(userRoles[obj.role])}</td>
              <td>${obj.account_source || this._('Password')}</td>
              <td class="user-actions">
                <md-icon-button
                  aria-label="${this._('Send password reset')}"
                  id="button-reset-${index}"
                  ?disabled="${!obj.email || this.busy}"
                  @click="${() =>
                    fireEvent(this, 'user:reset-password', obj.name)}"
                >
                  <grampsjs-icon
                    path="${mdiLockReset}"
                    height="20"
                    width="20"
                    color="var(--mdc-theme-secondary)"
                  ></grampsjs-icon>
                </md-icon-button>
                <grampsjs-tooltip for="button-reset-${index}">
                  ${this._('Send password reset')}
                </grampsjs-tooltip>
                <md-icon-button
                  class="edit"
                  aria-label="${this._('Edit user')}"
                  @click="${e => this._handleEditClick(e, obj.name)}"
                  id="button-edit-${index}"
                >
                  <grampsjs-icon
                    path="${mdiPencil}"
                    height="20"
                    width="20"
                    color="var(--mdc-theme-secondary)"
                  ></grampsjs-icon>
                </md-icon-button>
                <grampsjs-tooltip for="button-edit-${index}">
                  ${this._('Edit user')}
                </grampsjs-tooltip>
                <md-icon-button
                  class="error"
                  aria-label="${this._('Delete user')}"
                  @click="${e => this._handleDeleteClick(e, obj.name)}"
                  id="button-del-${index}"
                >
                  <grampsjs-icon
                    path="${mdiDeleteForever}"
                    height="20"
                    width="20"
                    color="var(--grampsjs-alert-error-font-color)"
                  ></grampsjs-icon>
                </md-icon-button>
                <grampsjs-tooltip for="button-del-${index}">
                  ${this._('Delete user')}
                </grampsjs-tooltip>
              </td>
            </tr>
          `
        )}
      </table>
      ${this._renderInvitations()}
      ${this.dialogContent === 'invite'
        ? this._addUserDialog()
        : this.dialogContent}
    `
  }

  _renderFilterBar() {
    return html`
      <div class="filter-bar">
        <md-filled-text-field
          type="search"
          label="${this._('Search')}"
          .value="${this._filterText}"
          @input="${e => {
            this._filterText = e.target.value
          }}"
        ></md-filled-text-field>
        <md-filled-select
          label="${this._('Role')}"
          .value="${this._filterRole}"
          @change="${e => {
            this._filterRole = e.target.value
          }}"
        >
          <md-select-option value="${ALL_ROLES}">
            <div slot="headline">${this._('All')}</div>
          </md-select-option>
          ${Object.keys(userRoles)
            .map(Number)
            .sort((a, b) => a - b)
            .map(
              role => html`
                <md-select-option value="${role}">
                  <div slot="headline">${this._(userRoles[role])}</div>
                </md-select-option>
              `
            )}
        </md-filled-select>
        ${this._filterText || this._filterRole !== ALL_ROLES
          ? html`
              <button
                class="clear-filters"
                id="btn-clear-filters"
                @click="${this._clearFilters}"
              >
                <grampsjs-icon
                  path="${mdiFilterOff}"
                  height="24"
                  width="24"
                  color="var(--mdc-theme-secondary)"
                ></grampsjs-icon>
              </button>
              <grampsjs-tooltip for="btn-clear-filters">
                ${this._('Clear all filters')}
              </grampsjs-tooltip>
            `
          : ''}
      </div>
    `
  }

  _renderInvitations() {
    if (!this.invitations.length) return ''
    return html` <h3>${this._('Pending invitations')}</h3>
      <table>
        <tr>
          <th>${this._('E-mail')}</th>
          <th>${this._('Role')}</th>
          <th>${this._('Status')}</th>
          <th></th>
        </tr>
        ${this.invitations.map(
          (invitation, index) => html`
            <tr>
              <td>${invitation.email}</td>
              <td>${this._(userRoles[invitation.role])}</td>
              <td>
                ${new Date(invitation.expires_at) <= new Date()
                  ? this._('Expired')
                  : this._('Awaiting acceptance')}
              </td>
              <td class="user-actions">
                <md-icon-button
                  aria-label="${this._('Resend invitation')}"
                  id="resend-invite-${index}"
                  ?disabled="${this.busy}"
                  @click="${() =>
                    fireEvent(this, 'user:resend-invitation', invitation.id)}"
                >
                  <grampsjs-icon
                    path="${mdiEmailArrowRight}"
                    height="20"
                    width="20"
                    color="var(--mdc-theme-secondary)"
                  ></grampsjs-icon>
                </md-icon-button>
                <grampsjs-tooltip for="resend-invite-${index}"
                  >${this._('Resend invitation')}</grampsjs-tooltip
                >
                <md-icon-button
                  aria-label="${this._('Revoke invitation')}"
                  id="revoke-invite-${index}"
                  ?disabled="${this.busy}"
                  @click="${() =>
                    fireEvent(this, 'user:revoke-invitation', invitation.id)}"
                >
                  <grampsjs-icon
                    path="${mdiDeleteForever}"
                    height="20"
                    width="20"
                    color="var(--grampsjs-alert-error-font-color)"
                  ></grampsjs-icon>
                </md-icon-button>
                <grampsjs-tooltip for="revoke-invite-${index}"
                  >${this._('Revoke invitation')}</grampsjs-tooltip
                >
              </td>
            </tr>
          `
        )}
      </table>`
  }

  _clearFilters() {
    this._filterText = ''
    this._filterRole = ALL_ROLES
  }

  _renderButtons() {
    return html`
      <p>
        <md-icon-button
          class="edit"
          aria-label="${this._('Invite user')}"
          @click="${this._handleAddClick}"
          id="button-add"
        >
          <grampsjs-icon
            path="${mdiAccountPlus}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
        <grampsjs-tooltip for="button-add">
          ${this._('Invite user')}
        </grampsjs-tooltip>

        <md-icon-button
          class="edit"
          aria-label="${this._('Import user accounts')}"
          id="button-import"
          @click="${this._handleImportClick}"
        >
          <grampsjs-icon
            path="${mdiAccountMultiplePlus}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
        <grampsjs-tooltip for="button-import">
          ${this._('Import user accounts')}
        </grampsjs-tooltip>

        <md-icon-button
          class="edit"
          aria-label="${this._('Export user details')}"
          id="button-export"
          @click="${this._handleExportClick}"
        >
          <grampsjs-icon
            path="${mdiDownload}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
        <grampsjs-tooltip for="button-export">
          ${this._('Export user details')}
        </grampsjs-tooltip>
        <a
          download="grampsweb-export-users.json"
          href="${this._downloadUrl}"
          id="downloadanchor"
          >&nbsp;</a
        >
      </p>
    `
  }

  _handleEditClick(e, username) {
    this.dialogContent = this._editUserDialog(username)
    this._openDialog()
  }

  _handleDeleteClick(e, username) {
    this.dialogContent = this._deleteUserDialog(username)
    this._openDialog()
  }

  _handleAddClick() {
    this.invitationError = ''
    this.dialogContent = 'invite'
  }

  _openDialog() {
    const dialog = this.shadowRoot.querySelector('md-dialog')
    if (dialog !== null) {
      dialog.show()
    }
  }

  _handleImportClick() {
    this._userData = []
    this.dialogContent = this._importUsersDialog()
    this._openDialog()
  }

  async _handleExportClick() {
    this._downloadUrl = ''
    const blob = new Blob([JSON.stringify(this.data)], {
      type: 'application/json',
    })
    this._downloadUrl = URL.createObjectURL(blob)
  }

  _importUsersDialog() {
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline">${this._('Import user accounts')}</span>
        <div slot="content">
          <grampsjs-form-upload
            accept=".json"
            filename
            @formdata:changed="${this._handleUploadChanged}"
          ></grampsjs-form-upload>
        </div>
        <div slot="actions">
          <md-text-button @click="${this._handleDialogCancel}">
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button
            ?disabled="${this._userData.length === 0}"
            @click="${this._handleUpload}"
          >
            ${this._('Import')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  async _handleUploadChanged() {
    const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload')
    try {
      const data = await uploadForm.readAsJson()
      this._processUserData(data)
    } catch {
      uploadForm.reset()
      fireEvent(this, 'grampsjs:error', {
        message: this._('Error parsing JSON file'),
      })
      return
    }
    this.dialogContent = this._importUsersDialog()
  }

  _processUserData(data) {
    const processedData = data
      .map(user => ({
        name: user.name,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      }))
      .filter(user => !!user.name)
    this._userData = processedData
  }

  async _handleUpload() {
    const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload')
    fireEvent(this, 'user:added-multiple', this._userData)
    uploadForm.reset()
    this.dialogContent = ''
  }

  _handleDialogCancel() {
    const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload')
    uploadForm.reset()
    this.dialogContent = ''
  }

  _startDownload() {
    this.shadowRoot.querySelector('#downloadanchor').click()
    URL.revokeObjectURL(this._downloadUrl)
    this._downloadUrl = ''
  }

  _editUserDialog(username) {
    const [user] = this.data.filter(el => el.name === username)
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline">${this._('Edit user')} &ndash; ${username}</span>
        <div slot="content">
          <grampsjs-form-user
            .data="${user}"
            .appState="${this.appState}"
            ?ismulti="${this.ismulti}"
          ></grampsjs-form-user>
        </div>
        <div slot="actions">
          <md-text-button
            @click="${() => {
              this.dialogContent = ''
            }}"
          >
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button @click="${this._handleSave}">
            ${this._('_Save')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  _deleteUserDialog(username) {
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <div slot="content">
          <div>
            ${this._('Do you really want to delete user "%s"?', username)}
          </div>
          <div>${this._('This action cannot be undone.')}</div>
        </div>
        <div slot="actions">
          <md-text-button
            @click="${() => {
              this.dialogContent = ''
            }}"
          >
            ${this._('Cancel')}
          </md-text-button>
          <md-text-button @click="${() => this._handleDelete(username)}">
            ${this._('_Delete')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _addUserDialog() {
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline">${this._('Invite user')}</span>
        <div slot="content">
          <p>
            ${this._(
              'They will receive an email to choose their username, full name, and password. The invitation is valid for 7 days.'
            )}
          </p>
          <div class="invite-fields">
            <md-filled-text-field
              id="invite-email"
              type="email"
              required
              label="${this._('E-mail')}"
              ?disabled="${this.busy}"
            ></md-filled-text-field>
            <md-filled-select
              id="invite-role"
              label="${this._('Role')}"
              .value="${'0'}"
              ?disabled="${this.busy}"
            >
              ${Object.keys(userRoles)
                .map(Number)
                .filter(role => role >= 0 && (role <= 4 || this.ismulti))
                .map(
                  role => html`
                    <md-select-option value="${role}"
                      ><div slot="headline">
                        ${this._(userRoles[role])}
                      </div></md-select-option
                    >
                  `
                )}
            </md-filled-select>
          </div>
          ${this.invitationError
            ? html`<p class="invite-error" role="alert">
                ${this.invitationError}
              </p>`
            : ''}
        </div>
        <div slot="actions">
          <md-text-button
            ?disabled="${this.busy}"
            @click="${() => {
              this.dialogContent = ''
            }}"
          >
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button
            @click="${this._handleInvite}"
            ?disabled="${this.busy}"
          >
            ${this._('Send invitation')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  _handleInvite() {
    const email = this.shadowRoot.querySelector('#invite-email')
    email.value = email.value.trim()
    if (!email.reportValidity()) return
    const role = Number(this.shadowRoot.querySelector('#invite-role').value)
    fireEvent(this, 'user:invited', {email: email.value, role})
  }

  _handleSave() {
    const form = this.shadowRoot.querySelector('grampsjs-form-user')
    if (form !== null) {
      const existingUser = this.data
        .map(user => user.name)
        .includes(form.data.name)
      fireEvent(this, existingUser ? 'user:updated' : 'user:added', form.data)
      this.dialogContent = ''
    }
  }

  _handleDelete(username) {
    fireEvent(this, 'user:deleted', username)
    this.dialogContent = ''
  }

  updated(changed) {
    if (changed.has('_downloadUrl') && this._downloadUrl) {
      this._startDownload()
    }
  }
}

window.customElements.define('grampsjs-users', GrampsjsUsers)
