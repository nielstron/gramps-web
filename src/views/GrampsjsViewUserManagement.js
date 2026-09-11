import {css, html} from 'lit'

import '@material/web/select/filled-select'
import '@material/web/select/select-option'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsUsers.js'
import '../components/GrampsjsShareUrl.js'
import '../components/GrampsjsChatPermissions.js'
import {appUrl} from '../appUrl.js'
import {fireEvent} from '../util.js'

export class GrampsjsViewUserManagement extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        grampsjs-share-url {
          --md-icon-button-icon-size: 18px;
          --md-icon-button-state-layer-width: 32px;
          --md-icon-button-state-layer-height: 32px;
          position: relative;
          top: -5px;
          color: var(--grampsjs-body-font-color-40);
        }

        span.url {
          border-radius: 5px;
          border: 1px solid var(--grampsjs-body-font-color-15);
          font-size: 13px;
          padding: 6px 6px;
          color: var(--grampsjs-body-font-color-75);
        }
      `,
    ]
  }

  static get properties() {
    return {
      userData: {type: Array},
      dbInfo: {type: Object},
      invitations: {type: Array},
      _actionBusy: {type: Boolean},
      _invitationError: {type: String},
    }
  }

  constructor() {
    super()
    this.userData = []
    this.dbInfo = {}
    this.invitations = []
    this._actionBusy = false
    this._invitationError = ''
  }

  // eslint-disable-next-line class-methods-use-this
  get _registerUrl() {
    const url = new URL(document.URL)
    const {tree} = this.appState.auth.claims
    return `${url.origin}${appUrl(`/register/${tree}`)}`
  }

  renderContent() {
    return html`
      ${this.dbInfo?.server?.chat
        ? html`<grampsjs-chat-permissions
            .appState="${this.appState}"
          ></grampsjs-chat-permissions>`
        : ''}
      ${this.dbInfo?.server?.multi_tree
        ? html` <p>
            ${this._('Registration link')}:
            <span class="url">${this._registerUrl}</span>
            <grampsjs-share-url
              href="${this._registerUrl}"
              .appState="${this.appState}"
            ></grampsjs-share-url>
          </p>`
        : ''}

      <grampsjs-users
        .appState="${this.appState}"
        .data="${this.userData}"
        .invitations="${this.invitations}"
        .busy="${this._actionBusy}"
        .invitationError="${this._invitationError}"
        ?ismulti="${!!this.dbInfo?.server?.multi_tree}"
        @user:updated="${this._handleUserChanged}"
        @user:invited="${this._handleUserInvited}"
        @user:added="${this._handleUserAdded}"
        @user:reset-password="${this._handlePasswordReset}"
        @user:resend-invitation="${this._handleResendInvitation}"
        @user:revoke-invitation="${this._handleRevokeInvitation}"
        @user:deleted="${this._handleUserDeleted}"
        @user:added-multiple="${this._handleUsersAdded}"
      >
      </grampsjs-users>
    `
  }

  firstUpdated() {
    this._fetchUserData()
    this._fetchInvitations()
  }

  _handleUserChanged(e) {
    const data = e.detail
    this._updateUser(e.detail.name, {
      role: data.role,
      email: data.email,
      full_name: data.full_name,
    })
  }

  async _handleUserInvited(e) {
    this._invitationError = ''
    const ok = await this._userAction(
      () =>
        this.appState.apiPost('/api/users/-/invitations/', e.detail, {
          dbChanged: false,
        }),
      'Invitation email queued',
      true
    )
    if (ok) {
      this.shadowRoot.querySelector('grampsjs-users').dialogContent = ''
    }
    await this._fetchInvitations()
  }

  async _handleUserAdded(e) {
    this._invitationError = ''
    const {name, email, role, full_name: fullName, password} = e.detail
    const ok = await this._userAction(
      () =>
        this.appState.apiPost(
          `/api/users/${encodeURIComponent(name)}/`,
          {email, role, full_name: fullName, password},
          {dbChanged: false}
        ),
      'User created',
      true
    )
    if (ok) {
      this.shadowRoot.querySelector('grampsjs-users').dialogContent = ''
      this._fetchUserData()
    }
  }

  async _handlePasswordReset(e) {
    await this._userAction(
      () =>
        this.appState.apiPost(
          `/api/users/${encodeURIComponent(e.detail)}/password/reset/trigger/`,
          {},
          {dbChanged: false}
        ),
      'Password reset email queued'
    )
  }

  async _handleResendInvitation(e) {
    if (
      await this._userAction(
        () =>
          this.appState.apiPost(
            `/api/users/-/invitations/${e.detail}/`,
            {},
            {dbChanged: false}
          ),
        'Invitation email queued'
      )
    )
      await this._fetchInvitations()
  }

  async _handleRevokeInvitation(e) {
    if (
      await this._userAction(
        () =>
          this.appState.apiDelete(`/api/users/-/invitations/${e.detail}/`, {
            dbChanged: false,
          }),
        'Invitation revoked'
      )
    )
      await this._fetchInvitations()
  }

  async _userAction(action, message, invitation = false) {
    if (this._actionBusy) return false
    this._actionBusy = true
    try {
      const result = await action()
      if ('error' in result) {
        if (invitation) this._invitationError = result.error
        else fireEvent(this, 'grampsjs:error', {message: result.error})
        return false
      }
      fireEvent(this, 'grampsjs:notification', {message: this._(message)})
      return true
    } finally {
      this._actionBusy = false
    }
  }

  async _fetchInvitations() {
    const result = await this.appState.apiGet('/api/users/-/invitations/')
    if ('error' in result)
      fireEvent(this, 'grampsjs:error', {message: result.error})
    else this.invitations = result.data
  }

  _handleUserDeleted(e) {
    this._deleteUser(e.detail)
  }

  async _handleUsersAdded(e) {
    const res = await this.appState.apiPost('/api/users/', e.detail)
    if ('error' in res) {
      this.error = true
      this._errorMessage = res.error
    } else {
      this.error = false
      this._fetchUserData()
    }
  }

  _updateUser(username, payload) {
    this.appState.apiPut(`/api/users/${username}/`, payload).then(data => {
      if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      } else {
        this.error = false
        this._fetchUserData()
      }
    })
  }

  _deleteUser(username) {
    this.appState.apiDelete(`/api/users/${username}/`).then(data => {
      if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      } else {
        this.error = false
        this._fetchUserData()
      }
    })
  }

  _fetchUserData() {
    this.loading = true
    this.appState.apiGet('/api/users/').then(data => {
      if ('data' in data) {
        this.error = false
        this.userData = data.data
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
      this.loading = false
    })
  }
}

window.customElements.define(
  'grampsjs-view-user-management',
  GrampsjsViewUserManagement
)
