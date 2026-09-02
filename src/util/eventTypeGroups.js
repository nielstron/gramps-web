// Keep this taxonomy in sync with gramps.gen.lib.eventtype.EventType._MENU.
export const EVENT_TYPE_GROUPS = [
  {
    label: 'Life Events',
    types: [
      'Birth',
      'Baptism',
      'Death',
      'Stillbirth',
      'Burial',
      'Cremation',
      'Adopted',
    ],
  },
  {
    label: 'Family',
    types: [
      'Engagement',
      'Marriage',
      'Divorce',
      'Annulment',
      'Marriage Settlement',
      'Marriage License',
      'Marriage Contract',
      'Marriage Banns',
      'Divorce Filing',
      'Alternate Marriage',
    ],
  },
  {
    label: 'Religious',
    types: [
      'Christening',
      'Adult Christening',
      'Confirmation',
      'First Communion',
      'Blessing',
      'Bar Mitzvah',
      'Bas Mitzvah',
      'Religion',
    ],
  },
  {
    label: 'Vocational',
    types: [
      'Occupation',
      'Retirement',
      'Elected',
      'Military Service',
      'Ordination',
    ],
  },
  {
    label: 'Academic',
    types: ['Education', 'Degree', 'Graduation'],
  },
  {
    label: 'Travel',
    types: ['Emigration', 'Immigration', 'Naturalization'],
  },
  {
    label: 'Legal',
    types: ['Probate', 'Will'],
  },
  {
    label: 'Residence',
    types: ['Residence', 'Census', 'Property'],
  },
  {
    label: 'Other',
    types: [
      'Cause Of Death',
      'Medical Information',
      'Nobility Title',
      'Number of Marriages',
    ],
  },
]

const identity = value => value

export function groupEventTypes(
  defaultTypes,
  customTypes,
  translate = identity,
  locale = 'en'
) {
  const availableDefaultTypes = new Set(defaultTypes)
  const categorizedTypes = new Set(
    EVENT_TYPE_GROUPS.flatMap(group => group.types)
  )
  const collator = new Intl.Collator(locale.replaceAll('_', '-'), {
    numeric: true,
    sensitivity: 'base',
  })
  const sortTypes = types =>
    [...new Set(types)].sort((left, right) =>
      collator.compare(translate(left), translate(right))
    )

  const groups = EVENT_TYPE_GROUPS.map(group => ({
    label: group.label,
    types: sortTypes(
      group.types.filter(type => availableDefaultTypes.has(type))
    ),
  }))

  const otherGroup = groups.find(group => group.label === 'Other')
  otherGroup.types = sortTypes([
    ...otherGroup.types,
    ...defaultTypes.filter(type => !categorizedTypes.has(type)),
  ])

  const uniqueCustomTypes = customTypes.filter(
    type => !availableDefaultTypes.has(type)
  )
  groups.push({label: 'Custom', types: sortTypes(uniqueCustomTypes)})

  return groups.filter(group => group.types.length > 0)
}
