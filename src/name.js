function nameType(name) {
  return typeof name?.type === 'string'
    ? name.type
    : name?.type?.string || name?.type?.value
}

function surnameFromName(name) {
  return (name?.surname_list || [])
    .map(surname =>
      [surname.prefix, surname.surname, surname.connector]
        .filter(Boolean)
        .join(' ')
    )
    .join(' ')
}

export function surnameWithBirthName(person, bornLabel = 'born') {
  const names = [
    person?.primary_name,
    ...(person?.alternate_names || []),
  ].filter(Boolean)
  const birthName = names.find(name => nameType(name) === 'Birth Name')
  const marriedName = names.find(name => nameType(name) === 'Married Name')
  const currentName =
    nameType(person?.primary_name) === 'Birth Name'
      ? marriedName || person.primary_name
      : person?.primary_name || marriedName
  const currentSurname =
    surnameFromName(currentName) || person?.profile?.name_surname
  const birthSurname = surnameFromName(birthName)
  if (!birthSurname || birthSurname === currentSurname) return currentSurname
  return `${currentSurname} (${bornLabel} ${birthSurname})`
}
