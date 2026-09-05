export function transactionHistoryUrl({
  page,
  pageSize,
  search = '',
  editor = '',
  person = '',
  objectClass = '',
  transType = '',
}) {
  const params = new URLSearchParams({
    sort: '-id',
    page: String(page),
    pagesize: String(pageSize),
  })
  const filters = {
    search: search.trim(),
    editor: editor.trim(),
    person: person.trim(),
    object_class: objectClass,
    trans_type: transType,
  }
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '') params.set(key, value)
  })
  return `/api/transactions/history/?${params.toString()}`
}
