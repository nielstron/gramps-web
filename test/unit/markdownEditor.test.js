import {describe, it, expect, vi} from 'vitest'
import {GrampsjsMarkdownEditor} from '../../src/components/GrampsjsMarkdownEditor.js'
import {GrampsjsViewNewBlogPost} from '../../src/views/GrampsjsViewNewBlogPost.js'

describe('Markdown editing', () => {
  it('saves the raw Markdown as StyledText without rich-text tags', () => {
    const editor = new GrampsjsMarkdownEditor()
    editor.appState = {path: {page: 'note', pageId: 'N0001'}}
    editor.id = 'note-text-editor'
    const dispatch = vi.spyOn(editor, 'dispatchEvent')
    editor._input({target: {value: '**Hello**\n\n![Image](media/O0001)'}})
    editor._save()
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'edit:action',
        detail: {
          action: 'updateProp',
          data: {
            text: {
              _class: 'StyledText',
              string: '**Hello**\n\n![Image](media/O0001)',
              tags: [],
            },
          },
          editorDraftPrefix: 'note:N0001:',
        },
      })
    )
    editor._cancel()
  })
  it('marks new blog notes as Markdown and removes an emptied note', () => {
    const view = new GrampsjsViewNewBlogPost()
    view.handleEditor({
      detail: {data: {_class: 'StyledText', string: '# Title', tags: []}},
    })
    expect(view.data.note.type).toBe('Markdown')
    view.handleEditor({detail: {data: {string: ''}}})
    expect(view.data.note).toBeUndefined()
  })
})
