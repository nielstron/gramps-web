import {describe, it, expect, vi, beforeEach} from 'vitest'
import {clearDraftsWithPrefix} from '../../src/api.js'
import {GrampsjsViewBlog} from '../../src/views/GrampsjsViewBlog.js'
import {GrampsjsBlogPost} from '../../src/components/GrampsjsBlogPost.js'
import {GrampsjsViewNewBlogPost} from '../../src/views/GrampsjsViewNewBlogPost.js'

vi.mock('../../src/api.js', async importActual => {
  const actual = await importActual()
  return {...actual, clearDraftsWithPrefix: vi.fn()}
})

const makeElement = () => {
  const element = new GrampsjsViewNewBlogPost()
  element.createRenderRoot()
  element._validateTitle = vi.fn().mockReturnValue(true)
  return element
}

describe('new blog post: processed data', () => {
  it('creates a single Source object when there is no note', () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {_class: 'Source', title: 'My trip to the archive'}

    const objects = element._processedData([])

    expect(objects).toHaveLength(1)
    expect(objects[0]).toMatchObject({
      _class: 'Source',
      title: 'My trip to the archive',
      tag_list: ['blog-tag-handle'],
      media_list: [],
    })
    expect(objects[0].note_list).toBeUndefined()
  })

  it('creates a Source and a linked Note when content is present', () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {
      _class: 'Source',
      title: 'My trip to the archive',
      note: {_class: 'Note', text: {_class: 'StyledText', string: 'Hello'}},
    }
    const mediaRefs = [{ref: 'media-handle-1'}]

    const [source, note] = element._processedData(mediaRefs)

    expect(source.title).toBe('My trip to the archive')
    expect(source.note_list).toEqual([note.handle])
    expect(source.media_list).toBe(mediaRefs)
    expect(source.tag_list).toEqual(['blog-tag-handle'])
    expect(note.tag_list).toEqual(['blog-tag-handle'])
    expect(note.text.string).toBe('Hello')
  })

  it('deduplicates the Blog tag against tags the user already picked', () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {
      _class: 'Source',
      title: 'Title',
      tag_list: ['blog-tag-handle', 'other-tag'],
    }

    const [source] = element._processedData([])

    expect(source.tag_list).toEqual(['blog-tag-handle', 'other-tag'])
  })
})

describe('new blog post: Blog tag handling', () => {
  it('reuses an existing Blog tag', async () => {
    const element = makeElement()
    const apiGet = vi.fn().mockResolvedValue({
      data: [{name: 'Blog', handle: 'existing-blog-handle'}],
    })
    const apiPost = vi.fn()
    element.appState = {apiGet, apiPost, i18n: {lang: 'en'}}

    await element._fetchBlogTagHandle()

    expect(element._blogTagHandle).toBe('existing-blog-handle')
    expect(apiPost).not.toHaveBeenCalled()
  })

  it('does not create a tag while merely looking one up', async () => {
    const element = makeElement()
    const apiGet = vi.fn().mockResolvedValue({data: []})
    const apiPost = vi.fn()
    element.appState = {apiGet, apiPost, i18n: {lang: 'en'}}

    await element._fetchBlogTagHandle()

    expect(apiPost).not.toHaveBeenCalled()
    expect(element._blogTagHandle).toBe('')
  })

  it('picks up the handle after creating the Blog tag', async () => {
    const element = makeElement()
    const apiGet = vi.fn().mockResolvedValue({
      data: [{name: 'Blog', handle: 'new-blog-handle'}],
    })
    const apiPost = vi.fn().mockResolvedValue({data: {}})
    element.appState = {apiGet, apiPost, i18n: {lang: 'en', strings: {}}}

    const errorMessage = await element._createBlogTag()

    expect(apiPost).toHaveBeenCalledWith('/api/tags/', {name: 'Blog'})
    expect(element._blogTagHandle).toBe('new-blog-handle')
    expect(errorMessage).toBe('')
  })

  it('reports the backend error when the Blog tag cannot be created', async () => {
    const element = makeElement()
    const apiGet = vi.fn()
    const apiPost = vi.fn().mockResolvedValue({error: 'Not authorized'})
    element.appState = {apiGet, apiPost, i18n: {lang: 'en', strings: {}}}

    const errorMessage = await element._createBlogTag()

    expect(errorMessage).toBe('Not authorized')
    expect(apiGet).not.toHaveBeenCalled()
    expect(element._blogTagHandle).toBe('')
  })

  it('reports a generic error when the created tag cannot be found', async () => {
    const element = makeElement()
    const apiGet = vi.fn().mockResolvedValue({data: []})
    const apiPost = vi.fn().mockResolvedValue({data: {}})
    element.appState = {apiGet, apiPost, i18n: {lang: 'en', strings: {}}}

    const errorMessage = await element._createBlogTag()

    expect(errorMessage).toBe('Failed to fetch the Blog tag')
  })
})

describe('new blog post: media selection', () => {
  // The media picker (grampsjs-form-select-object-list, objectType="media")
  // emits a formdata:changed event from its inner id="media-list" list with
  // the array of selected handles.
  const makeMediaListEvent = data => {
    const target = document.createElement('div')
    target.id = 'media-list'
    const event = new CustomEvent('formdata:changed', {detail: {data}})
    Object.defineProperty(event, 'composedPath', {value: () => [target]})
    return event
  }

  // checkFormValidity() (called from _handleFormData) looks up #source-name,
  // so stub a minimal stand-in for it.
  const stubNameField = element => {
    const nameField = document.createElement('div')
    nameField.id = 'source-name'
    nameField.reportValidity = () => true
    nameField.validity = {valid: true}
    element.shadowRoot.append(nameField)
  }

  it('maps selected media handles to media_list refs', () => {
    const element = makeElement()
    stubNameField(element)
    element.data = {_class: 'Source', title: 'Title'}

    element._handleFormData(
      makeMediaListEvent(['media-handle-1', 'media-handle-2'])
    )

    expect(element.data.media_list).toEqual([
      {ref: 'media-handle-1'},
      {ref: 'media-handle-2'},
    ])
  })

  it('clears media_list when the selection is emptied', () => {
    const element = makeElement()
    stubNameField(element)
    element.data = {
      _class: 'Source',
      title: 'Title',
      media_list: [{ref: 'media-handle-1'}],
    }

    element._handleFormData(makeMediaListEvent([]))

    expect(element.data.media_list).toEqual([])
  })
})

describe('new blog post: submit', () => {
  beforeEach(() => {
    clearDraftsWithPrefix.mockClear()
  })

  it('applies the Blog tag, submits the picked media_list, and navigates to the new post', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {
      _class: 'Source',
      title: 'My trip to the archive',
      media_list: [{ref: 'media-handle-1'}],
    }
    element._reset = vi.fn()
    const apiPost = vi.fn().mockResolvedValue({
      data: [{new: {_class: 'Source', gramps_id: 'S0001'}}],
    })
    element.appState = {apiPost, i18n: {strings: {}}}
    vi.spyOn(element, 'dispatchEvent')

    await element._submit()

    expect(apiPost).toHaveBeenCalledWith(
      '/api/objects/',
      expect.arrayContaining([
        expect.objectContaining({
          title: 'My trip to the archive',
          media_list: [{ref: 'media-handle-1'}],
        }),
      ])
    )
    expect(element.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({type: 'nav', detail: {path: 'blog/S0001'}})
    )
    expect(element._reset).toHaveBeenCalledOnce()
    expect(element.error).toBe(false)
    expect(element._isSaving).toBe(false)
  })

  it('creates the Blog tag on submit when the tree does not have one', async () => {
    const element = makeElement()
    element._blogTagHandle = ''
    element.data = {_class: 'Source', title: 'Title'}
    element._reset = vi.fn()
    element._fetchBlogTagHandle = vi.fn().mockResolvedValue()
    element._createBlogTag = vi.fn().mockImplementation(async () => {
      element._blogTagHandle = 'new-blog-handle'
      return ''
    })
    const apiPost = vi.fn().mockResolvedValue({
      data: [{new: {_class: 'Source', gramps_id: 'S0001'}}],
    })
    element.appState = {apiPost, i18n: {strings: {}}}

    await element._submit()

    expect(element._createBlogTag).toHaveBeenCalledOnce()
    expect(apiPost).toHaveBeenCalledWith(
      '/api/objects/',
      expect.arrayContaining([
        expect.objectContaining({tag_list: ['new-blog-handle']}),
      ])
    )
    expect(element.error).toBe(false)
  })

  it('shows an error and does not submit when the Blog tag cannot be created', async () => {
    const element = makeElement()
    element._blogTagHandle = ''
    element._fetchBlogTagHandle = vi.fn().mockResolvedValue()
    const apiPost = vi.fn().mockResolvedValue({error: 'Not authorized'})
    element.appState = {apiPost, i18n: {strings: {}}}

    await element._submit()

    expect(element.error).toBe(true)
    expect(element._errorMessage).toBe('Not authorized')
    expect(apiPost).toHaveBeenCalledOnce()
    expect(apiPost).toHaveBeenCalledWith('/api/tags/', {name: 'Blog'})
    expect(element._isSaving).toBe(false)
  })

  it('stays busy until the object-create request resolves, preventing double-submit', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {_class: 'Source', title: 'Title'}
    element._reset = vi.fn()
    let resolveApiPost
    const apiPost = vi.fn(
      () =>
        new Promise(resolve => {
          resolveApiPost = resolve
        })
    )
    element.appState = {apiPost, i18n: {strings: {}}}

    const submitPromise = element._submit()
    await Promise.resolve()
    await Promise.resolve()
    expect(element._isSaving).toBe(true)

    resolveApiPost({data: [{new: {_class: 'Source', gramps_id: 'S0001'}}]})
    await submitPromise

    expect(element._isSaving).toBe(false)
  })

  it('clears the busy state and reports the error without navigating when the create request fails', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {_class: 'Source', title: 'Title'}
    const apiPost = vi.fn().mockResolvedValue({error: 'Server exploded'})
    element.appState = {apiPost, i18n: {strings: {}}}
    vi.spyOn(element, 'dispatchEvent')

    await element._submit()

    expect(element._isSaving).toBe(false)
    expect(element.error).toBe(true)
    expect(element._errorMessage).toBe('Server exploded')
    expect(element.dispatchEvent).not.toHaveBeenCalled()
  })

  it('ignores a second submit while the first one is still in flight', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {_class: 'Source', title: 'Title'}
    element._reset = vi.fn()
    let resolveApiPost
    const apiPost = vi.fn(
      () =>
        new Promise(resolve => {
          resolveApiPost = resolve
        })
    )
    element.appState = {apiPost, i18n: {strings: {}}}

    const submitPromise = element._submit()
    await element._submit()

    expect(apiPost).toHaveBeenCalledOnce()

    resolveApiPost({data: [{new: {_class: 'Source', gramps_id: 'S0001'}}]})
    await submitPromise
  })

  it('clears the editor draft for this page after a successful save', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {_class: 'Source', title: 'Title'}
    element._reset = vi.fn()
    const apiPost = vi.fn().mockResolvedValue({
      data: [{new: {_class: 'Source', gramps_id: 'S0001'}}],
    })
    element.appState = {
      apiPost,
      i18n: {strings: {}},
      path: {page: 'new_blog_post', pageId: ''},
    }

    await element._submit()

    expect(clearDraftsWithPrefix).toHaveBeenCalledWith('new_blog_post::')
  })

  it('keeps the draft when the create request fails', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {_class: 'Source', title: 'Title'}
    const apiPost = vi.fn().mockResolvedValue({error: 'Server exploded'})
    element.appState = {
      apiPost,
      i18n: {strings: {}},
      path: {page: 'new_blog_post', pageId: ''},
    }

    await element._submit()

    expect(clearDraftsWithPrefix).not.toHaveBeenCalled()
  })
})

describe('blog editor focus', () => {
  it('checks an empty title silently while typing content', () => {
    const element = makeElement()
    const field = document.createElement('div')
    field.id = 'source-name'
    field.validity = {valid: false}
    field.reportValidity = vi.fn()
    element.shadowRoot.append(field)
    element.checkFormValidity()
    expect(element.isFormValid).toBe(false)
    expect(field.reportValidity).not.toHaveBeenCalled()
  })
})

it('validates on Add and does not submit when the title is missing', async () => {
  const element = makeElement()
  element._validateTitle.mockReturnValue(false)
  element.appState = {apiPost: vi.fn()}
  await element._submit()
  expect(element._validateTitle).toHaveBeenCalledOnce()
  expect(element.appState.apiPost).not.toHaveBeenCalled()
})

describe('edit blog post', () => {
  it('saves source and body in one transaction preserving their identities and references', async () => {
    const element = makeElement()
    const source = {
      _class: 'Source',
      handle: 'source',
      gramps_id: 'S1',
      title: 'Old',
      author: 'Original author',
      note_list: ['body', 'other-note'],
      media_list: [{ref: 'cover'}],
    }
    const note = {
      _class: 'Note',
      handle: 'body',
      gramps_id: 'N1',
      text: {string: 'Old'},
    }
    element._originalSource = source
    element._loadPost = vi.fn()
    element._originalNote = note
    element.data = {
      ...source,
      title: 'Updated',
      note: {...note, text: {string: 'Updated body'}},
    }
    element.appState = {apiPost: vi.fn().mockResolvedValue({data: []})}
    await element._savePost()
    const [url, changes] = element.appState.apiPost.mock.calls[0]
    expect(url).toContain('/api/transactions/')
    expect(changes).toHaveLength(2)
    expect(changes[0]).toMatchObject({
      type: 'update',
      handle: 'body',
      old: note,
      new: {gramps_id: 'N1', text: {string: 'Updated body'}},
    })
    expect(changes[1]).toMatchObject({
      type: 'update',
      handle: 'source',
      old: source,
      new: {
        author: 'Original author',
        title: 'Updated',
        note_list: ['body', 'other-note'],
        media_list: [{ref: 'cover'}],
      },
    })
  })

  it('retains the form and reports a failed edit instead of navigating', async () => {
    const element = makeElement()
    element.grampsId = 'S1'
    element._blogTagHandle = 'blog'
    element._originalSource = {_class: 'Source', handle: 'source'}
    element.data = {...element._originalSource, title: 'Unsaved'}
    element.appState = {
      apiPost: vi.fn().mockResolvedValue({error: 'Changed by another editor'}),
    }
    const navigate = vi.fn()
    element.addEventListener('nav', navigate)
    await element._submit()
    expect(navigate).not.toHaveBeenCalled()
    expect(element.data.title).toBe('Unsaved')
    expect(element._errorMessage).toBe('Changed by another editor')
    expect(element._isSaving).toBe(false)
  })
})

describe('blog edit visibility', () => {
  it('only offers Edit to the associated author with edit permission', () => {
    const post = new GrampsjsBlogPost()
    post.source = {attribute_list: [{type: 'Blog author', value: 'author-id'}]}
    post.appState = {
      auth: {claims: {sub: 'author-id'}},
      permissions: {canEdit: true},
    }
    expect(post._isAuthor()).toBe(true)
    post.appState = {...post.appState, auth: {claims: {sub: 'another-editor'}}}
    expect(post._isAuthor()).toBe(false)
    post.appState = {
      auth: {claims: {sub: 'author-id'}},
      permissions: {canEdit: false},
    }
    expect(post._isAuthor()).toBe(false)
  })
})

describe('blog title typing', () => {
  it('preserves spaces while typing a multiword title', () => {
    const element = makeElement()
    element.handleName({target: {value: 'Family '}})
    expect(element.data.title).toBe('Family ')
    element.handleName({target: {value: 'Family history '}})
    expect(element.data.title).toBe('Family history ')
  })
})

describe('server blog drafts', () => {
  it('saves an untitled draft as private source and note without publishing or validating the title', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog'
    element._draftTagHandle = 'draft'
    element.data = {
      _class: 'Source',
      title: '',
      tag_list: ['blog', 'custom'],
      note: {
        _class: 'Note',
        type: 'Markdown',
        text: {string: 'Work in progress'},
      },
    }
    element.appState = {
      apiPost: vi.fn().mockResolvedValue({
        data: [{new: {_class: 'Source', gramps_id: 'S1'}}],
      }),
    }
    element._reset = vi.fn()
    await element._saveDraft()
    expect(element._validateTitle).not.toHaveBeenCalled()
    const [source, note] = element.appState.apiPost.mock.calls[0][1]
    expect(source.private).toBe(true)
    expect(note.private).toBe(true)
    expect(source.tag_list).toEqual(expect.arrayContaining(['draft', 'custom']))
    expect(source.tag_list).not.toContain('blog')
  })

  it('publishes a saved draft in place and makes both records public', async () => {
    const element = makeElement()
    element.grampsId = 'S1'
    element._blogTagHandle = 'blog'
    element._draftTagHandle = 'draft'
    element._originalSource = {
      _class: 'Source',
      handle: 'source',
      gramps_id: 'S1',
      title: 'Draft',
      private: true,
      tag_list: ['draft'],
      note_list: ['note'],
    }
    element._originalNote = {
      _class: 'Note',
      handle: 'note',
      private: true,
      text: {string: 'Body'},
    }
    element.data = {...element._originalSource, note: element._originalNote}
    element.appState = {apiPost: vi.fn().mockResolvedValue({data: []})}
    await element._submit()
    const changes = element.appState.apiPost.mock.calls[0][1]
    expect(
      changes.every(
        change => change.type === 'update' && change.new.private === false
      )
    ).toBe(true)
    expect(changes[1].new.tag_list).toEqual(['blog'])
    expect(changes[1].handle).toBe('source')
  })
})

it('refreshes My drafts when account permissions become available after initial rendering', () => {
  const view = new GrampsjsViewBlog()
  view.active = true
  view.appState = {permissions: {canAdd: true}}
  view._fetchDrafts = vi.fn()
  view.updated(new Map([['appState', {permissions: {canAdd: false}}]]))
  expect(view._fetchDrafts).toHaveBeenCalledOnce()
})

it('keeps published-post saves and unpublishing in the edit view and refreshes the saved snapshot', async () => {
  for (const draft of [false, true]) {
    const element = makeElement()
    element.grampsId = 'S1'
    element._originalSource = {
      _class: 'Source',
      handle: 'source',
      gramps_id: 'S1',
      title: 'Published',
      private: false,
    }
    element.data = {...element._originalSource, private: draft}
    element._savingDraft = draft
    element._loadPost = vi.fn()
    element.appState = {apiPost: vi.fn().mockResolvedValue({data: []})}
    const nav = vi.fn()
    element.addEventListener('nav', nav)
    await element._savePost()
    expect(nav).not.toHaveBeenCalled()
    expect(element._loadPost).toHaveBeenCalledOnce()
  }
})
