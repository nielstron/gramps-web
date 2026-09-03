import {describe, expect, it, vi} from 'vitest'

import {GrampsjsViewAdminSettings} from '../../src/views/GrampsjsViewAdminSettings.js'

const emailSettings = {
  host: 'smtp.example.com',
  port: 587,
  username: 'mailer',
  from_email: 'family@example.com',
  security: 'starttls',
  password_set: true,
}

describe('administration email settings', () => {
  it('loads SMTP settings without a password', async () => {
    const view = new GrampsjsViewAdminSettings()
    view.appState = {
      apiGet: vi.fn().mockResolvedValue({data: emailSettings}),
    }

    await view._fetchEmailSettings()

    expect(view.appState.apiGet).toHaveBeenCalledWith('/api/config/email/')
    expect(view._emailSettings).toEqual(emailSettings)
    expect(view._emailPassword).toBe('')
  })

  it('updates SMTP settings and sends a test email', async () => {
    const view = new GrampsjsViewAdminSettings()
    view._emailSettings = {...emailSettings}
    view._emailPassword = 'new secret'
    view._testEmail = 'admin@example.com'
    view.appState = {
      apiPut: vi.fn().mockResolvedValue({data: {}}),
      apiPost: vi.fn().mockResolvedValue({data: {message: 'sent'}}),
    }

    await view._saveEmailSettings()
    await view._sendTestEmail()

    expect(view.appState.apiPut).toHaveBeenCalledWith('/api/config/email/', {
      host: 'smtp.example.com',
      port: 587,
      username: 'mailer',
      password: 'new secret',
      from_email: 'family@example.com',
      security: 'starttls',
    })
    expect(view.appState.apiPost).toHaveBeenCalledWith(
      '/api/config/email/test/',
      {recipient: 'admin@example.com'}
    )
  })
})
