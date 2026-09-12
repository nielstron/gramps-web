import {it, expect} from 'vitest'
import {GrampsjsInvitationSettings} from '../../src/components/GrampsjsInvitationSettings.js'

it('preserves invitation placeholders through translation and previews the tree name', () => {
  const settings = new GrampsjsInvitationSettings()
  settings.appState = {i18n: {strings: {}}, treeConfig: {}}
  settings.treeName = 'Bond family'
  expect(settings.subject).toBe('You are invited to {tree_name}')
  expect(settings._preview(settings.subject)).toBe(
    'You are invited to Bond family'
  )
  expect(settings._preview(settings.message)).toContain('join Bond family')
})
