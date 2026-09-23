import {
  arrayEqual,
  normalizeRect,
  objectTypeToEndpoint,
  getNameFromProfile,
} from './util.js'

export function linkedPeople(data) {
  const profiles = data?.profile?.references?.person || []
  return (data?.extended?.backlinks?.person || []).map((person, index) => ({
    object_type: 'person',
    handle: person.handle,
    object: {...person, profile: profiles[index] || person.profile},
  }))
}

export function mediaRectangles(data) {
  const profiles = data?.profile?.references || {}
  return Object.entries(data?.extended?.backlinks || {})
    .flatMap(([type, people]) =>
      people.map((person, index) => ({
        rect: person.media_list?.find(ref => ref.ref === data.handle)?.rect,
        type,
        label: getNameFromProfile(profiles[type]?.[index] || {}, type),
        grampsId: person.gramps_id,
        handle: person.handle,
      }))
    )
    .filter(person => person.rect?.length > 0)
}

export async function linkFace(
  appState,
  {
    personHandle,
    mediaHandle,
    rect,
    oldHandle,
    oldType,
    onlyIfUnannotated = false,
  }
) {
  const normalized = normalizeRect(rect)
  if (!normalized) return {error: 'Invalid face rectangle coordinates'}
  const url = `/api/people/${personHandle}`
  const response = await appState.apiGet(url)
  if (!('data' in response)) return response
  const person = response.data
  const existing = person.media_list.find(ref => ref.ref === mediaHandle)
  if (onlyIfUnannotated && (!existing || existing.rect?.length)) return response
  const reference = {...existing, ref: mediaHandle, rect: normalized}
  const media = existing
    ? person.media_list.map(ref => (ref === existing ? reference : ref))
    : [...person.media_list, reference]
  const result = await appState.apiPut(url, {
    ...person,
    _class: 'Person',
    media_list: media,
  })
  if (!('data' in result)) return result
  if (oldHandle && oldHandle !== personHandle) {
    return unlinkFace(appState, {
      objHandle: oldHandle,
      objType: oldType,
      mediaHandle,
      rect,
    })
  }
  return result
}

export async function unlinkFace(
  appState,
  {objHandle, objType, mediaHandle, rect}
) {
  const url = `/api/${objectTypeToEndpoint[objType]}/${objHandle}`
  const response = await appState.apiGet(url)
  if (!('data' in response)) return response
  return appState.apiPut(url, {
    ...response.data,
    media_list: response.data.media_list.filter(
      ref => ref.ref !== mediaHandle || !arrayEqual(ref.rect, rect)
    ),
  })
}
