// Helpers for adding relationship facts without creating order-dependent
// duplicate families. Every uncertain decision is based on freshly loaded
// family links; the chart's person object is only a fallback.

const PERSON_RELATIONS_EXTEND =
  'family_list,parent_family_list,primary_parent_family'

const MERGED_LIST_FIELDS = [
  'attribute_list',
  'child_ref_list',
  'citation_list',
  'event_ref_list',
  'lds_ord_list',
  'media_list',
  'note_list',
  'tag_list',
]

function cleanFamily(familyData) {
  const {extended, profile, backlinks, formatted, ...clean} = familyData
  return clean
}

// gender: 0 = Female → mother slot, 1 = Male → father slot
// Unknown/Other genders fall back to father slot.
function parentSlot(gender) {
  return gender === 0 ? 'mother_handle' : 'father_handle'
}

function familyHasParent(family, handle) {
  return family?.father_handle === handle || family?.mother_handle === handle
}

function familyHasChild(family, handle) {
  return family?.child_ref_list?.some(childRef => childRef.ref === handle)
}

function familyParents(family) {
  return [family?.father_handle, family?.mother_handle].filter(Boolean)
}

function otherParentSlot(family, handle) {
  if (family?.father_handle === handle) return 'mother_handle'
  if (family?.mother_handle === handle) return 'father_handle'
  return null
}

function availableParentSlot(family, gender) {
  const preferred = parentSlot(gender)
  if (!family?.[preferred]) return preferred
  if (gender !== 0 && gender !== 1) {
    const other =
      preferred === 'father_handle' ? 'mother_handle' : 'father_handle'
    if (!family?.[other]) return other
  }
  return null
}

function relationFamilies(person) {
  const families = [
    ...(person?.extended?.families ?? []),
    ...(person?.extended?.parent_families ?? []),
  ]
  const primary = person?.extended?.primary_parent_family
  if (primary?.handle) families.push(primary)
  return uniqueFamilies(families)
}

function uniqueFamilies(families) {
  return [
    ...new Map(
      families
        .filter(family => family?.handle)
        .map(family => [family.handle, family])
    ).values(),
  ]
}

async function freshPerson(appState, handle, fallback = {}) {
  const result = await appState.apiGet(
    `/api/people/${handle}?extend=${PERSON_RELATIONS_EXTEND}`
  )
  if ('error' in result) return result
  if (result.data?.handle === handle) return result
  return {data: fallback}
}

function itemKey(item) {
  if (typeof item !== 'object' || item === null) return String(item)
  if (item.ref) return `ref:${item.ref}`
  if (item.handle) return `handle:${item.handle}`
  return JSON.stringify(item)
}

function mergeList(left = [], right = []) {
  return [
    ...new Map([...left, ...right].map(item => [itemKey(item), item])).values(),
  ]
}

function isUnknownType(type) {
  return (
    !type ||
    type === 'Unknown' ||
    (typeof type === 'object' && type.value === 2 && !type.string)
  )
}

function mergeFamilyObjects(target, sources) {
  const merged = cleanFamily(target)
  for (const source of sources) {
    const cleanSource = cleanFamily(source)
    for (const field of MERGED_LIST_FIELDS) {
      if (field in merged || field in cleanSource) {
        merged[field] = mergeList(merged[field], cleanSource[field])
      }
    }
    if (isUnknownType(merged.type) && !isUnknownType(cleanSource.type)) {
      merged.type = cleanSource.type
    }
    if ('private' in merged || 'private' in cleanSource) {
      merged.private = Boolean(merged.private || cleanSource.private)
    }
    if ('complete' in merged || 'complete' in cleanSource) {
      merged.complete = Math.max(
        merged.complete ?? 0,
        cleanSource.complete ?? 0
      )
    }
  }
  return merged
}

function addOrUpdateChildRef(family, childHandle, frel, mrel) {
  const refs = [...(family.child_ref_list ?? [])]
  const index = refs.findIndex(ref => ref.ref === childHandle)
  const childRef =
    index === -1 ? {_class: 'ChildRef', ref: childHandle} : {...refs[index]}
  if (frel) childRef.frel = frel
  if (mrel) childRef.mrel = mrel
  if (index === -1) refs.push(childRef)
  else refs[index] = childRef
  return refs
}

async function saveReconciledFamily(
  appState,
  target,
  sources,
  {fatherHandle, motherHandle, childHandle, frel, mrel, type}
) {
  const family = mergeFamilyObjects(target, sources)
  if (fatherHandle) family.father_handle = fatherHandle
  if (motherHandle) family.mother_handle = motherHandle
  if (childHandle) {
    family.child_ref_list = addOrUpdateChildRef(family, childHandle, frel, mrel)
  }
  if (type) family.type = type

  const result = await appState.apiPut(`/api/families/${target.handle}`, {
    _class: 'Family',
    ...family,
  })
  if ('error' in result) return result

  for (const source of sources) {
    const deleteResult = await appState.apiDelete(
      `/api/families/${source.handle}`
    )
    if ('error' in deleteResult) return deleteResult
  }
  return result
}

function requestedParentSet(fatherHandle, motherHandle) {
  return new Set([fatherHandle, motherHandle].filter(Boolean))
}

function parentsAreSubset(family, handles) {
  return familyParents(family).every(handle => handles.has(handle))
}

function familyAcceptsRequestedParents(family, fatherHandle, motherHandle) {
  const fatherFits =
    !fatherHandle ||
    familyHasParent(family, fatherHandle) ||
    !family.father_handle
  const motherFits =
    !motherHandle ||
    familyHasParent(family, motherHandle) ||
    !family.mother_handle
  return fatherFits && motherFits
}

/**
 * Reconcile a complete set of requested family facts. This is used by forms
 * that know the intended parents and optional child, and is the common path
 * for combining a pre-existing couple with a pre-existing parent-child link.
 */
export async function linkFamily(
  appState,
  {fatherHandle, motherHandle, childHandle, frel, mrel, type}
) {
  const handles = [
    ...new Set([fatherHandle, motherHandle, childHandle].filter(Boolean)),
  ]
  const peopleResults = await Promise.all(
    handles.map(handle => freshPerson(appState, handle))
  )
  const error = peopleResults.find(result => 'error' in result)
  if (error) return error

  const families = uniqueFamilies(
    peopleResults.flatMap(result => relationFamilies(result.data))
  )
  const parents = requestedParentSet(fatherHandle, motherHandle)
  const exactCouple =
    parents.size === 2
      ? families.find(family =>
          [...parents].every(handle => familyHasParent(family, handle))
        )
      : null
  const compatibleChildFamilies =
    childHandle && parents.size > 0
      ? families.filter(
          family =>
            familyHasChild(family, childHandle) &&
            familyAcceptsRequestedParents(family, fatherHandle, motherHandle)
        )
      : []
  const target = exactCouple ?? compatibleChildFamilies[0]

  if (!target) {
    const childRef = childHandle
      ? addOrUpdateChildRef({}, childHandle, frel, mrel)
      : undefined
    return appState.apiPost('/api/families/', {
      _class: 'Family',
      ...(fatherHandle ? {father_handle: fatherHandle} : {}),
      ...(motherHandle ? {mother_handle: motherHandle} : {}),
      ...(childRef ? {child_ref_list: childRef} : {}),
      ...(type ? {type} : {}),
    })
  }

  // A second family is redundant only when it contributes this requested
  // child relationship. Exact duplicate couples without the child are left
  // alone because Gramps permits repeated unions between the same people.
  const sources = families.filter(
    family =>
      family.handle !== target.handle &&
      childHandle &&
      familyHasChild(family, childHandle) &&
      parentsAreSubset(family, parents)
  )
  return saveReconciledFamily(appState, target, sources, {
    fatherHandle,
    motherHandle,
    childHandle,
    frel,
    mrel,
    type,
  })
}

export async function linkParent(appState, personData, parentHandle, role) {
  const childResult = await freshPerson(appState, personData.handle, personData)
  if ('error' in childResult) return childResult
  const child = childResult.data
  const parentFamilies = uniqueFamilies([
    ...(child.extended?.parent_families ?? []),
    ...(child.extended?.primary_parent_family?.handle
      ? [child.extended.primary_parent_family]
      : []),
  ])
  const existing = parentFamilies.find(family =>
    familyHasParent(family, parentHandle)
  )
  if (existing) return {data: cleanFamily(existing)}

  const parentFamily =
    child.extended?.primary_parent_family ?? parentFamilies[0]
  if (parentFamily?.handle) {
    const slot = `${role}_handle`
    if (parentFamily[slot]) {
      return {error: `The family already has a ${role}.`}
    }
    return linkFamily(appState, {
      fatherHandle:
        role === 'father' ? parentHandle : parentFamily.father_handle,
      motherHandle:
        role === 'mother' ? parentHandle : parentFamily.mother_handle,
      childHandle: personData.handle,
    })
  }

  // If the parent belongs to exactly one union, adding the parent from the
  // child's side means adding the child to that union, too.
  const parentResult = await freshPerson(appState, parentHandle)
  if ('error' in parentResult) return parentResult
  const families = parentResult.data?.extended?.families ?? []
  if (families.length === 1) {
    return saveReconciledFamily(appState, families[0], [], {
      childHandle: personData.handle,
    })
  }

  return appState.apiPost('/api/families/', {
    _class: 'Family',
    [`${role}_handle`]: parentHandle,
    child_ref_list: [{_class: 'ChildRef', ref: personData.handle}],
  })
}

export async function linkChild(appState, personData, childHandle, frel, mrel) {
  const localFamilies = personData.extended?.families ?? []
  const localExisting = localFamilies.find(family =>
    familyHasChild(family, childHandle)
  )
  if (localExisting) return {data: cleanFamily(localExisting)}

  const [parentResult, childResult] = await Promise.all([
    freshPerson(appState, personData.handle, personData),
    freshPerson(appState, childHandle),
  ])
  if ('error' in parentResult) return parentResult
  if ('error' in childResult) return childResult
  const parent = parentResult.data
  const childFamily = childResult.data?.extended?.primary_parent_family
  if (childFamily?.handle) {
    if (familyHasParent(childFamily, personData.handle)) {
      return {data: cleanFamily(childFamily)}
    }
    const slot = availableParentSlot(childFamily, parent.gender)
    if (slot) {
      return linkFamily(appState, {
        fatherHandle:
          slot === 'father_handle'
            ? personData.handle
            : childFamily.father_handle,
        motherHandle:
          slot === 'mother_handle'
            ? personData.handle
            : childFamily.mother_handle,
        childHandle,
        frel,
        mrel,
      })
    }
  }

  const existingFamilies = parent.extended?.families ?? []
  const existing = existingFamilies.find(family =>
    familyHasChild(family, childHandle)
  )
  if (existing) return {data: cleanFamily(existing)}
  if (existingFamilies.length === 1) {
    return saveReconciledFamily(appState, existingFamilies[0], [], {
      childHandle,
      frel,
      mrel,
    })
  }

  const childRef = {_class: 'ChildRef', ref: childHandle}
  if (frel) childRef.frel = frel
  if (mrel) childRef.mrel = mrel
  return appState.apiPost('/api/families/', {
    _class: 'Family',
    [parentSlot(parent.gender)]: personData.handle,
    child_ref_list: [childRef],
  })
}

export async function linkSibling(appState, personData, siblingHandle) {
  const [personResult, siblingResult] = await Promise.all([
    freshPerson(appState, personData.handle, personData),
    freshPerson(appState, siblingHandle),
  ])
  if ('error' in personResult) return personResult
  if ('error' in siblingResult) return siblingResult

  const parentFamilies = person =>
    uniqueFamilies([
      ...(person.extended?.parent_families ?? []),
      ...(person.extended?.primary_parent_family?.handle
        ? [person.extended.primary_parent_family]
        : []),
    ])
  const personFamilies = parentFamilies(personResult.data)
  const siblingFamilies = parentFamilies(siblingResult.data)
  const shared = personFamilies.find(family =>
    siblingFamilies.some(other => other.handle === family.handle)
  )
  if (shared) return {data: cleanFamily(shared)}

  const target = personFamilies[0] ?? siblingFamilies[0]
  if (target) {
    const childHandle = personFamilies.length
      ? siblingHandle
      : personData.handle
    return saveReconciledFamily(appState, target, [], {childHandle})
  }

  return appState.apiPost('/api/families/', {
    _class: 'Family',
    child_ref_list: [personData.handle, siblingHandle].map(ref => ({
      _class: 'ChildRef',
      ref,
    })),
  })
}

export async function linkSpouse(appState, personData, spouseHandle, relType) {
  const localFamilies = personData.extended?.families ?? []
  const localCouple = localFamilies.find(
    family =>
      familyHasParent(family, personData.handle) &&
      familyHasParent(family, spouseHandle)
  )
  if (localCouple) {
    if (!relType) return {data: cleanFamily(localCouple)}
    return saveReconciledFamily(appState, localCouple, [], {type: relType})
  }

  const [personResult, spouseResult] = await Promise.all([
    freshPerson(appState, personData.handle, personData),
    freshPerson(appState, spouseHandle),
  ])
  if ('error' in personResult) return personResult
  if ('error' in spouseResult) return spouseResult
  const families = uniqueFamilies([
    ...relationFamilies(personResult.data),
    ...relationFamilies(spouseResult.data),
  ])
  const existingCouple = families.find(
    family =>
      familyHasParent(family, personData.handle) &&
      familyHasParent(family, spouseHandle)
  )
  if (existingCouple) {
    if (!relType) return {data: cleanFamily(existingCouple)}
    return saveReconciledFamily(appState, existingCouple, [], {type: relType})
  }

  const incompleteFamilies = families.filter(family => {
    const containsOne =
      familyHasParent(family, personData.handle) !==
      familyHasParent(family, spouseHandle)
    return containsOne && familyParents(family).length === 1
  })
  if (incompleteFamilies.length === 1) {
    const family = incompleteFamilies[0]
    const existingHandle = familyParents(family)[0]
    const emptySlot = otherParentSlot(family, existingHandle)
    return saveReconciledFamily(appState, family, [], {
      [emptySlot === 'father_handle' ? 'fatherHandle' : 'motherHandle']:
        existingHandle === personData.handle ? spouseHandle : personData.handle,
      type: relType,
    })
  }
  if (
    incompleteFamilies.length === 2 &&
    incompleteFamilies.some(family =>
      familyHasParent(family, personData.handle)
    ) &&
    incompleteFamilies.some(family => familyHasParent(family, spouseHandle))
  ) {
    const target = incompleteFamilies.find(family =>
      familyHasParent(family, personData.handle)
    )
    const source = incompleteFamilies.find(
      family => family.handle !== target.handle
    )
    const personParentSlot = otherParentSlot(target, personData.handle)
    return saveReconciledFamily(appState, target, [source], {
      [personParentSlot === 'father_handle' ? 'fatherHandle' : 'motherHandle']:
        spouseHandle,
      type: relType,
    })
  }

  const slot = parentSlot(personResult.data?.gender ?? personData.gender)
  const otherSlot = slot === 'father_handle' ? 'mother_handle' : 'father_handle'
  return appState.apiPost('/api/families/', {
    _class: 'Family',
    [slot]: personData.handle,
    [otherSlot]: spouseHandle,
    ...(relType ? {type: relType} : {}),
  })
}
