import {describe, expect, it, vi} from 'vitest'
import {
  linkChild,
  linkFamily,
  linkParent,
  linkSibling,
  linkSpouse,
} from '../../src/util/familyLinks.js'

function appState({getResult, getResults = {}} = {}) {
  return {
    apiDelete: vi.fn().mockResolvedValue({data: {}}),
    apiGet: vi.fn(url =>
      Promise.resolve(getResults[url] ?? getResult ?? {data: {}})
    ),
    apiPost: vi.fn().mockResolvedValue({data: {}}),
    apiPut: vi.fn().mockResolvedValue({data: {}}),
  }
}

function person(handle, gender, families = [], primaryParentFamily = null) {
  return {
    handle,
    gender,
    extended: {
      families,
      primary_parent_family: primaryParentFamily,
    },
  }
}

describe('family links', () => {
  it('reuses an existing couple regardless of parent-slot orientation', async () => {
    const family = {
      handle: 'F1',
      father_handle: 'H',
      mother_handle: 'U',
      child_ref_list: [{_class: 'ChildRef', ref: 'S'}],
    }
    const state = appState()

    await linkSpouse(state, person('U', 2, [family]), 'H', 'Married')

    expect(state.apiPost).not.toHaveBeenCalled()
    expect(state.apiPut).toHaveBeenCalledWith('/api/families/F1', {
      _class: 'Family',
      ...family,
      type: 'Married',
    })
  })

  it('uses the actual occupied slot instead of gender when completing a couple', async () => {
    const family = {
      handle: 'F1',
      mother_handle: 'U',
      child_ref_list: [{_class: 'ChildRef', ref: 'S'}],
    }
    const state = appState()

    await linkSpouse(state, person('U', 2, [family]), 'H')

    expect(state.apiPost).not.toHaveBeenCalled()
    expect(state.apiPut).toHaveBeenCalledWith('/api/families/F1', {
      _class: 'Family',
      ...family,
      father_handle: 'H',
    })
  })

  it('does not add the same child reference twice', async () => {
    const family = {
      handle: 'F1',
      father_handle: 'P',
      child_ref_list: [{_class: 'ChildRef', ref: 'C'}],
    }
    const state = appState()

    await linkChild(state, person('P', 1, [family]), 'C', 'Birth', 'Birth')

    expect(state.apiGet).not.toHaveBeenCalled()
    expect(state.apiPost).not.toHaveBeenCalled()
    expect(state.apiPut).not.toHaveBeenCalled()
  })

  it('adds a sibling to the existing parent family', async () => {
    const family = {
      handle: 'F1',
      father_handle: 'P',
      child_ref_list: [{_class: 'ChildRef', ref: 'C'}],
    }
    const current = {
      ...person('C', 2),
      extended: {
        families: [],
        parent_families: [family],
        primary_parent_family: family,
      },
    }
    const state = appState({
      getResults: {
        '/api/people/C?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: current,
          },
        '/api/people/S?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: person('S', 2),
          },
      },
    })

    await linkSibling(state, current, 'S')

    expect(state.apiPost).not.toHaveBeenCalled()
    expect(state.apiPut).toHaveBeenCalledWith('/api/families/F1', {
      _class: 'Family',
      ...family,
      child_ref_list: [
        {_class: 'ChildRef', ref: 'C'},
        {_class: 'ChildRef', ref: 'S'},
      ],
    })
  })

  it('adds a second parent to the child existing family instead of creating another family', async () => {
    const family = {
      handle: 'F1',
      father_handle: 'F',
      child_ref_list: [{_class: 'ChildRef', ref: 'C'}],
    }
    const state = appState({
      getResult: {
        data: person('C', 2, [], family),
      },
    })

    await linkChild(state, person('M', 0), 'C', 'Birth', 'Birth')

    expect(state.apiGet).toHaveBeenCalledWith(
      '/api/people/C?extend=family_list,parent_family_list,primary_parent_family'
    )
    expect(state.apiPost).not.toHaveBeenCalled()
    expect(state.apiPut).toHaveBeenCalledWith('/api/families/F1', {
      _class: 'Family',
      ...family,
      child_ref_list: [
        {_class: 'ChildRef', ref: 'C', frel: 'Birth', mrel: 'Birth'},
      ],
      mother_handle: 'M',
    })
  })

  it('does not put one parent into both slots', async () => {
    const family = {
      handle: 'F1',
      father_handle: 'P',
      child_ref_list: [{_class: 'ChildRef', ref: 'C'}],
    }
    const state = appState()

    await linkParent(state, person('C', 2, [], family), 'P', 'mother')

    expect(state.apiPost).not.toHaveBeenCalled()
    expect(state.apiPut).not.toHaveBeenCalled()
  })

  it('uses a freshly loaded couple when a parent is added from the child', async () => {
    const couple = {
      handle: 'F1',
      father_handle: 'P',
      mother_handle: 'Q',
      child_ref_list: [],
    }
    const state = appState({
      getResults: {
        '/api/people/C?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: person('C', 2),
          },
        '/api/people/P?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: person('P', 1, [couple]),
          },
      },
    })

    await linkParent(state, person('C', 2), 'P', 'father')

    expect(state.apiPost).not.toHaveBeenCalled()
    expect(state.apiPut).toHaveBeenCalledWith('/api/families/F1', {
      _class: 'Family',
      ...couple,
      child_ref_list: [{_class: 'ChildRef', ref: 'C'}],
    })
  })

  it('ignores stale chart data when completing a one-parent family', async () => {
    const partial = {
      handle: 'F1',
      father_handle: 'P',
      child_ref_list: [{_class: 'ChildRef', ref: 'C'}],
    }
    const state = appState({
      getResults: {
        '/api/people/P?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: person('P', 2, [partial]),
          },
        '/api/people/Q?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: person('Q', 2),
          },
      },
    })

    await linkSpouse(state, person('P', 2), 'Q', 'Married')

    expect(state.apiPost).not.toHaveBeenCalled()
    expect(state.apiPut).toHaveBeenCalledWith('/api/families/F1', {
      _class: 'Family',
      ...partial,
      mother_handle: 'Q',
      type: 'Married',
    })
  })

  it('adds a child to an existing couple from the full family form', async () => {
    const couple = {
      handle: 'F1',
      father_handle: 'P',
      mother_handle: 'Q',
      child_ref_list: [],
    }
    const state = appState({
      getResults: {
        '/api/people/P?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: person('P', 1, [couple]),
          },
        '/api/people/Q?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: person('Q', 0, [couple]),
          },
        '/api/people/C?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: person('C', 2),
          },
      },
    })

    await linkFamily(state, {
      fatherHandle: 'P',
      motherHandle: 'Q',
      childHandle: 'C',
      frel: 'Birth',
      mrel: 'Birth',
      type: 'Married',
    })

    expect(state.apiPost).not.toHaveBeenCalled()
    expect(state.apiPut).toHaveBeenCalledWith('/api/families/F1', {
      _class: 'Family',
      ...couple,
      child_ref_list: [
        {_class: 'ChildRef', ref: 'C', frel: 'Birth', mrel: 'Birth'},
      ],
      type: 'Married',
    })
  })

  it('consolidates complementary partial families into the requested family', async () => {
    const couple = {
      handle: 'F-couple',
      father_handle: 'P',
      mother_handle: 'Q',
      child_ref_list: [],
      type: 'Married',
    }
    const childFamily = {
      handle: 'F-child',
      mother_handle: 'Q',
      child_ref_list: [
        {_class: 'ChildRef', ref: 'C', frel: 'Birth', mrel: 'Birth'},
      ],
      note_list: ['N1'],
    }
    const state = appState({
      getResults: {
        '/api/people/P?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: person('P', 1, [couple]),
          },
        '/api/people/Q?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: person('Q', 0, [couple]),
          },
        '/api/people/C?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: {
              ...person('C', 2),
              extended: {
                families: [],
                parent_families: [childFamily],
                primary_parent_family: childFamily,
              },
            },
          },
      },
    })

    await linkFamily(state, {
      fatherHandle: 'P',
      motherHandle: 'Q',
      childHandle: 'C',
      frel: 'Birth',
      mrel: 'Birth',
      type: 'Married',
    })

    expect(state.apiPost).not.toHaveBeenCalled()
    expect(state.apiPut).toHaveBeenCalledWith('/api/families/F-couple', {
      _class: 'Family',
      ...couple,
      child_ref_list: childFamily.child_ref_list,
      note_list: ['N1'],
    })
    expect(state.apiDelete).toHaveBeenCalledWith('/api/families/F-child')
  })

  it('adds one selected parent to the child existing other-parent family', async () => {
    const partial = {
      handle: 'F1',
      mother_handle: 'Q',
      child_ref_list: [{_class: 'ChildRef', ref: 'C'}],
    }
    const state = appState({
      getResults: {
        '/api/people/P?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: person('P', 1),
          },
        '/api/people/C?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: {
              ...person('C', 2),
              extended: {
                families: [],
                parent_families: [partial],
                primary_parent_family: partial,
              },
            },
          },
      },
    })

    await linkFamily(state, {fatherHandle: 'P', childHandle: 'C'})

    expect(state.apiPost).not.toHaveBeenCalled()
    expect(state.apiPut).toHaveBeenCalledWith('/api/families/F1', {
      _class: 'Family',
      ...partial,
      father_handle: 'P',
    })
  })

  it('combines two one-parent families when their parents become spouses', async () => {
    const fatherFamily = {
      handle: 'F-father',
      father_handle: 'P',
      child_ref_list: [{_class: 'ChildRef', ref: 'C'}],
    }
    const motherFamily = {
      handle: 'F-mother',
      mother_handle: 'Q',
      child_ref_list: [{_class: 'ChildRef', ref: 'C'}],
      note_list: ['N1'],
    }
    const state = appState({
      getResults: {
        '/api/people/P?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: person('P', 1, [fatherFamily]),
          },
        '/api/people/Q?extend=family_list,parent_family_list,primary_parent_family':
          {
            data: person('Q', 0, [motherFamily]),
          },
      },
    })

    await linkSpouse(state, person('P', 1), 'Q', 'Married')

    expect(state.apiPost).not.toHaveBeenCalled()
    expect(state.apiPut).toHaveBeenCalledWith('/api/families/F-father', {
      _class: 'Family',
      ...fatherFamily,
      mother_handle: 'Q',
      note_list: ['N1'],
      type: 'Married',
    })
    expect(state.apiDelete).toHaveBeenCalledWith('/api/families/F-mother')
  })
})
