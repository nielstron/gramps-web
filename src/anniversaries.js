export const DEFAULT_ANNIVERSARY_RELATIONSHIP_DEGREE = 4

export function participantHandles(event) {
  const participants = event?.profile?.participants ?? {}
  const people = (participants.people ?? []).map(
    participant => participant?.person?.handle
  )
  const families = (participants.families ?? []).flatMap(participant => {
    const family = participant?.family ?? participant
    return [family?.father?.handle, family?.mother?.handle]
  })
  return [...new Set([...people, ...families].filter(Boolean))]
}
