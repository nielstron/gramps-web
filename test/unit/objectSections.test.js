import {render} from 'lit'
import {describe, expect, test} from 'vitest'

import {GrampsjsObject} from '../../src/components/GrampsjsObject.js'

const getTabs = (data, {edit = false, canAdd = true} = {}) =>
  GrampsjsObject.prototype._getTabs.call(
    {
      data,
      appState: {permissions: {canAdd}},
      _showReferences: true,
      _showRevisions: () => false,
    },
    edit
  )

const getCount = (key, data, revisionCount) =>
  GrampsjsObject.prototype._getSectionCount.call(
    {data, _revisionCount: revisionCount},
    key
  )

describe('object detail sections', () => {
  test('omits empty repeatable sections outside edit mode', () => {
    const tabs = getTabs({
      primary_name: {},
      family_list: [],
      parent_family_list: [],
      child_ref_list: [],
      event_ref_list: [],
      media_list: [],
      note_list: [],
      citation_list: [],
      person_ref_list: [],
      reporef_list: [],
      attribute_list: [],
      address_list: [],
      urls: [],
      backlinks: {},
    })

    expect(tabs).toEqual(['names'])
  })

  test('keeps empty repeatable sections available in edit mode', () => {
    const tabs = getTabs(
      {
        child_ref_list: [],
        event_ref_list: [],
        media_list: [],
        note_list: [],
        citation_list: [],
      },
      {edit: true}
    )

    expect(tabs).toEqual([
      'children',
      'events',
      'gallery',
      'notes',
      'sourceCitations',
    ])
  })

  test('shows populated repeatable sections outside edit mode', () => {
    const tabs = getTabs({
      child_ref_list: [{ref: 'person'}],
      note_list: ['note'],
    })

    expect(tabs).toEqual(['children', 'notes'])
  })

  test('omits empty place hierarchy and backlink references', () => {
    const tabs = getTabs({
      placeref_list: [],
      backlinks: {event: [], person: []},
    })

    expect(tabs).not.toContain('enclosed')
    expect(tabs).not.toContain('references')
  })

  test('counts entries in repeatable sections', () => {
    const data = {
      family_list: ['F1', 'F2'],
      parent_family_list: ['F3'],
      child_ref_list: ['I1', 'I2'],
      event_ref_list: ['E1', 'E2', 'E3'],
      attribute_list: ['A1'],
      address_list: ['A1', 'A2'],
      urls: ['U1'],
      backlinks: {person: ['I3'], family: ['F4', 'F5']},
      profile: {
        participants: {people: ['I1', 'I2'], families: ['F1']},
      },
    }

    expect(getCount('relationships', data)).toBe(3)
    expect(getCount('children', data)).toBe(2)
    expect(getCount('events', data)).toBe(3)
    expect(getCount('metadata', data)).toBe(4)
    expect(getCount('participants', data)).toBe(3)
    expect(getCount('references', data)).toBe(3)
  })

  test('does not add a count to single-value sections', () => {
    expect(getCount('map', {})).toBeUndefined()
  })

  test('uses the asynchronously loaded revision count', () => {
    expect(getCount('revisions', {}, 12)).toBe(12)
  })

  test('renders the count beside the section title', () => {
    const container = document.createElement('div')
    const data = {child_ref_list: ['I1', 'I2']}
    const context = {
      data,
      edit: false,
      preview: false,
      tocSidebar: true,
      _currentTab: '',
      _getTabs: () => ['children'],
      _: value => value,
      _getSectionCount: key => getCount(key, data),
      renderSectionContent: () => '',
    }

    render(GrampsjsObject.prototype.renderSections.call(context), container)

    expect(container.querySelector('h3').textContent).toContain('Children')
    expect(container.querySelector('.section-count').textContent).toBe('2')
  })
})
