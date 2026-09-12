export const BLOG_COVER_ATTRIBUTE = 'Blog cover'

export function blogCoverHandle(source) {
  const setting = source.attribute_list?.find(
    attribute =>
      (attribute.type?.string ?? attribute.type) === BLOG_COVER_ATTRIBUTE
  )
  return setting ? setting.value : source.media_list?.[0]?.ref || ''
}

export function withBlogCover(source, handle) {
  return {
    ...source,
    attribute_list: [
      ...(source.attribute_list || []).filter(
        attribute =>
          (attribute.type?.string ?? attribute.type) !== BLOG_COVER_ATTRIBUTE
      ),
      {
        _class: 'SrcAttribute',
        type: BLOG_COVER_ATTRIBUTE,
        value: handle,
        private: false,
      },
    ],
    media_list:
      handle && !source.media_list?.some(ref => ref.ref === handle)
        ? [...(source.media_list || []), {ref: handle}]
        : source.media_list || [],
  }
}
