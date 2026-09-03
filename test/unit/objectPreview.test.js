import {afterEach, describe, expect, it} from 'vitest'

import {GrampsjsObjectPreview} from '../../src/components/GrampsjsObjectPreview.js'
import {GrampsjsPerson} from '../../src/components/GrampsjsPerson.js'

const appState = {
  i18n: {lang: 'en', strings: {}},
  permissions: {canAdd: true, canEdit: true},
}

function templateMarkup(template) {
  if (template === undefined || template === null) return ''
  if (Array.isArray(template)) return template.map(templateMarkup).join('')
  if (!template?.strings) return String(template)
  return template.strings.reduce(
    (result, string, index) =>
      `${result}${string}${templateMarkup(template.values[index])}`,
    ''
  )
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('object preview', () => {
  it('renders a compact person summary with one relative picker', () => {
    const person = new GrampsjsPerson()
    person.appState = appState
    person.preview = true
    person.data = {
      gramps_id: 'I1',
      handle: 'person-handle',
      profile: {name_given: 'Anna', name_surname: 'Müller'},
      family_list: ['family-handle'],
      parent_family_list: [],
      backlinks: {},
      extended: {families: [], parent_families: [], tags: []},
    }

    const markup = templateMarkup(person.render())
    expect(markup).toContain('preview-add-relative')
    expect(markup).toContain('<grampsjs-tree-chart-add-person')
    expect(markup).not.toContain('<grampsjs-tags')
    expect(markup).not.toContain('Relationships')
  })

  it('dismisses an open preview immediately on an outside pointer press', async () => {
    const preview = new GrampsjsObjectPreview()
    preview.appState = appState
    document.body.append(preview)
    preview._visible = true
    await preview.updateComplete

    document.body.dispatchEvent(
      new Event('pointerdown', {bubbles: true, composed: true})
    )

    expect(preview._visible).toBe(false)
  })

  it('uses compact dimensions for a person preview', async () => {
    const preview = new GrampsjsObjectPreview()
    preview.appState = appState
    preview._objectType = 'person'
    document.body.append(preview)
    await preview.updateComplete

    const popup = preview.renderRoot.querySelector('#popup')
    expect(popup.style.width).toBe('400px')
    expect(Number.parseInt(popup.style.maxHeight, 10)).toBeLessThanOrEqual(320)
  })
})
