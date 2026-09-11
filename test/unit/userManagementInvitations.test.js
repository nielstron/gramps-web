import {describe, expect, it, vi} from 'vitest'
import {GrampsjsViewUserManagement} from '../../src/views/GrampsjsViewUserManagement.js'
import {GrampsjsUsers} from '../../src/components/GrampsjsUsers.js'

function createView() {
  const view = new GrampsjsViewUserManagement()
  view.appState = {
    i18n: {strings: {}},
    apiGet: vi.fn().mockResolvedValue({data: []}),
    apiPost: vi.fn().mockResolvedValue({data: {}}),
    apiDelete: vi.fn().mockResolvedValue({data: {}}),
  }
  return view
}

describe('user management invitations', () => {
  it('sends a password reset for the selected user and reports success', async () => {
    const view = createView()
    const notify = vi.fn()
    view.addEventListener('grampsjs:notification', notify)
    await view._handlePasswordReset({detail: 'person+family@example.org'})
    expect(view.appState.apiPost).toHaveBeenCalledWith(
      '/api/users/person%2Bfamily%40example.org/password/reset/trigger/',
      {},
      {dbChanged: false}
    )
    expect(notify).toHaveBeenCalledOnce()
    expect(view._actionBusy).toBe(false)
  })

  it('submits only email and role from the invitation dialog', () => {
    const users = new GrampsjsUsers()
    const event = vi.fn()
    users.addEventListener('user:invited', event)
    const email = {value: ' invited@example.org ', reportValidity: () => true}
    vi.spyOn(users, 'shadowRoot', 'get').mockReturnValue({
      querySelector: selector =>
        selector === '#invite-email' ? email : {value: '3'},
    })
    users._handleInvite()
    expect(event.mock.calls[0][0].detail).toEqual({
      email: 'invited@example.org',
      role: 3,
    })
  })

  it('keeps the invitation dialog open on API failure', async () => {
    const view = createView()
    view.appState.apiPost.mockResolvedValue({error: 'Email delivery failed'})
    await view._handleUserInvited({detail: {email: 'new@example.org', role: 1}})
    expect(view._invitationError).toBe('Email delivery failed')
    expect(view._actionBusy).toBe(false)
  })

  it('submits complete account details when manual setup is selected', () => {
    const users = new GrampsjsUsers()
    users._manualUser = true
    const event = vi.fn()
    const invite = vi.fn()
    users.addEventListener('user:added', event)
    users.addEventListener('user:invited', invite)
    const fields = Object.fromEntries(
      Object.entries({
        '#invite-email': ' manual@example.org ',
        '#invite-role': '2',
        '#user-name': ' manual-user ',
        '#user-full-name': ' Manual Person ',
        '#user-password': ' chosen password ',
      }).map(([key, value]) => [key, {value, reportValidity: () => true}])
    )
    vi.spyOn(users, 'shadowRoot', 'get').mockReturnValue({
      querySelector: selector => fields[selector],
    })
    users._handleInvite()
    expect(event.mock.calls[0][0].detail).toEqual({
      name: 'manual-user',
      full_name: 'Manual Person',
      email: 'manual@example.org',
      role: 2,
      password: ' chosen password ',
    })
    expect(invite).not.toHaveBeenCalled()
  })

  it('creates manual accounts through the existing user endpoint', async () => {
    const view = createView()
    const users = {dialogContent: 'invite'}
    vi.spyOn(view, 'shadowRoot', 'get').mockReturnValue({
      querySelector: () => users,
    })
    const payload = {
      name: 'manual+user',
      full_name: 'Manual Person',
      email: 'manual@example.org',
      role: 2,
      password: 'chosen password',
    }
    await view._handleUserAdded({detail: payload})
    expect(view.appState.apiPost).toHaveBeenCalledWith(
      '/api/users/manual%2Buser/',
      {
        full_name: payload.full_name,
        email: payload.email,
        role: payload.role,
        password: payload.password,
      },
      {dbChanged: false}
    )
    expect(users.dialogContent).toBe('')
    expect(view.appState.apiGet).toHaveBeenCalledWith('/api/users/')
  })

  it('refreshes pending invitations after resend and revoke', async () => {
    const view = createView()
    await view._handleResendInvitation({detail: 'invite-id'})
    expect(view.appState.apiPost).toHaveBeenCalledWith(
      '/api/users/-/invitations/invite-id/',
      {},
      {dbChanged: false}
    )
    await view._handleRevokeInvitation({detail: 'invite-id'})
    expect(view.appState.apiDelete).toHaveBeenCalledWith(
      '/api/users/-/invitations/invite-id/',
      {dbChanged: false}
    )
    expect(view.appState.apiGet).toHaveBeenCalledTimes(2)
  })

  it('prevents duplicate sends while a request is pending', async () => {
    const view = createView()
    let resolve
    view.appState.apiPost.mockReturnValue(
      new Promise(_resolve => {
        resolve = _resolve
      })
    )
    const first = view._handlePasswordReset({detail: 'person'})
    await view._handlePasswordReset({detail: 'person'})
    expect(view.appState.apiPost).toHaveBeenCalledOnce()
    resolve({data: {}})
    await first
    expect(view._actionBusy).toBe(false)
  })
})
