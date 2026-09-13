export function blogPublicationTimestamp(source) {
  const value = source?.attribute_list?.find(
    attribute =>
      (attribute.type?.string || attribute.type) === 'Blog publication date'
  )?.value
  return value ? Date.parse(value) / 1000 : undefined
}
