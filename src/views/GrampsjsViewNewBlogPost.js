import {live} from 'lit/directives/live.js'
import {keyed} from 'lit/directives/keyed.js'
import {withBlogCover, blogCoverHandle} from '../blogCover.js'
import '../components/GrampsjsFormSelectObject.js'
import '../components/GrampsjsImg.js'
import '@material/web/button/text-button.js'
import '@material/web/button/filled-button.js'
import '@material/web/button/outlined-button.js'
import {html} from 'lit'

import '@material/web/textfield/outlined-text-field'

import '../components/GrampsjsMarkdownEditor.js'
import '../components/GrampsjsFormString.js'
import '../components/GrampsjsFormSelectObjectList.js'
import {GrampsjsViewNewSource} from './GrampsjsViewNewSource.js'

import {makeHandle, fireEvent} from '../util.js'
import {clearDraftsWithPrefix} from '../api.js'

const dataDefault = {
  _class: 'Source',
}

export class GrampsjsViewNewBlogPost extends GrampsjsViewNewSource {
  static get properties() {
    return {
      _blogTagHandle: {type: String},
      _draftTagHandle: {type: String},
      _savedNotice: {state: true},
      grampsId: {type: String},
      _loadedId: {state: true},
      _editorData: {state: true},
      _isSaving: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {...dataDefault}
    this.postUrl = '/api/objects/'
    this.itemPath = 'blog'
    this.objClass = 'Source'
    this._blogTagHandle = ''
    this._draftTagHandle = ''
    this._savingDraft = false
    this._savedNotice = ''
    this._isSaving = false
    this.grampsId = ''
    this._loadedId = ''
    this._editorData = {_class: 'StyledText', string: '', tags: []}
    this._originalSource = null
    this._originalNote = null
  }

  renderContent() {
    return html`
      <h2>${this._(this.grampsId ? 'Edit Blog Post' : 'New Blog Post')}</h2>

      <h4 class="label">${this._('Title')}</h4>
      <p>
        <md-outlined-text-field
          required
          style="width:100%;"
          @input="${this.handleName}"
          id="source-name"
          .value=${live(this.data.title || '')}
        ></md-outlined-text-field>
      </p>

      ${this.grampsId
        ? html`<h4 class="label">${this._('Author')}</h4>
            <p>${this.data.author}</p>`
        : ''}

      <h4 class="label">${this._('Cover image')}</h4>
      <grampsjs-form-select-object
        objectType="media"
        label=${this._('Choose cover image')}
        .appState=${this.appState}
        @select-object:changed=${this._selectCover}
      ></grampsjs-form-select-object>
      ${blogCoverHandle(this.data)
        ? html`<grampsjs-img
              style="max-width:240px"
              handle=${blogCoverHandle(this.data)}
              size="300"
            ></grampsjs-img
            ><md-text-button
              @click=${() => {
                this.data = withBlogCover(this.data, '')
              }}
              >${this._('Remove cover image')}</md-text-button
            >`
        : ''}
      <h4 class="label">${this._('Content')}</h4>
      <p>
        ${keyed(
          this._loadedId,
          html`<grampsjs-markdown-editor
            @formdata:changed="${this.handleEditor}"
            id="blog-post-content-editor"
            .initialData=${this._editorData}
            .appState="${this.appState}"
          ></grampsjs-markdown-editor>`
        )}
      </p>

      ${this._renderTagsForm()}

      <div class="spacer"></div>
      ${this._savedNotice
        ? html`<p role="status">${this._savedNotice}</p>`
        : ''}
      ${this._isSaving
        ? html`<p>${this._('Saving...')}</p>`
        : this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  async _selectCover(event) {
    event.stopPropagation()
    const selected = event.detail.objects[0]
    const handle = selected.handle ?? selected.object?.handle
    const result = await this.appState.apiGet(`/api/media/${handle}`)
    if ('error' in result) {
      fireEvent(this, 'grampsjs:error', {message: result.error})
      return
    }
    if (!result.data.mime.startsWith('image/')) {
      fireEvent(this, 'grampsjs:error', {
        message: this._('Please choose an image for the cover.'),
      })
      return
    }
    this.data = withBlogCover(this.data, handle)
  }

  handleName(e) {
    this.checkFormValidity()
    this.data = {...this.data, title: e.target.value}
  }

  _handleFormData(e) {
    this.checkFormValidity()
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'media-list') {
      this.data = {
        ...this.data,
        media_list: (e.detail.data || []).map(ref => ({ref})),
      }
    }
  }

  handleEditor(e) {
    if (e.detail?.data?.string && e.detail.data.string.trim()) {
      this.data = {
        ...this.data,
        note: {
          ...this._originalNote,
          _class: 'Note',
          type: 'Markdown',
          text: e.detail.data,
        },
      }
    } else {
      if (this._originalNote)
        this.data = {
          ...this.data,
          note: {...this._originalNote, type: 'Markdown', text: e.detail.data},
        }
      else {
        const {note, ...data} = this.data
        this.data = data
      }
    }
  }

  checkFormValidity() {
    const name = this.shadowRoot.getElementById('source-name')
    try {
      this.isFormValid = name?.validity?.valid
    } catch {
      this.isFormValid = false
    }
  }

  _reset() {
    if (this.grampsId) {
      this._clearDrafts()
      this._loadPost()
      return
    }
    super._reset()
    const name = this.shadowRoot.getElementById('source-name')
    if (name) {
      name.value = ''
    }
    const text = this.shadowRoot.querySelector('grampsjs-markdown-editor')
    text.reset()
    this.isFormValid = false
    this.data = {...dataDefault}
    this._isSaving = false
  }

  _processedData(mediaRefs) {
    const {note, ...source} = this.data
    const tagList = [
      ...new Set(
        [
          this._savingDraft ? this._draftTagHandle : this._blogTagHandle,
          ...(this.data.tag_list || []),
        ].filter(Boolean)
      ),
    ]
    if (!note?.text?.string) {
      return [
        {
          ...source,
          tag_list: tagList,
          media_list: mediaRefs,
        },
      ]
    }
    const handleSource = makeHandle()
    const handleNote = makeHandle()
    return [
      {
        ...source,
        handle: handleSource,
        note_list: [handleNote],
        tag_list: tagList,
        media_list: mediaRefs,
      },
      {
        ...note,
        private: !!this.data.private,
        handle: handleNote,
        tag_list: tagList,
      },
    ]
  }

  async _fetchBlogTagHandle() {
    const lang = this.appState?.i18n?.lang || 'en'
    const data = await this.appState.apiGet(
      `/api/tags/?locale=${lang}&pagesize=500`
    )
    if ('data' in data) {
      this._allTags = data.data
      this._draftTagHandle =
        data.data.find(tag => tag.name === 'Blog Draft')?.handle || ''
      const tags = data.data.filter(tag => tag.name === 'Blog')
      if (tags.length > 0) {
        this._blogTagHandle = tags[0].handle
      }
    }
  }

  // create the Blog tag, returning an error message if it could not be
  // created or found afterwards
  async _createBlogTag() {
    const data = await this.appState.apiPost('/api/tags/', {name: 'Blog'})
    if ('error' in data) {
      return data.error
    }
    await this._fetchBlogTagHandle()
    return this._blogTagHandle ? '' : this._('Failed to fetch the Blog tag')
  }

  firstUpdated() {
    this._fetchBlogTagHandle()
  }

  updated(changed) {
    super.updated?.(changed)
    if (this.active && (changed.has('active') || changed.has('grampsId'))) {
      if (this.grampsId) this._loadPost()
      else if (this._loadedId) {
        this._originalSource = null
        this._originalNote = null
        this.data = {...dataDefault}
        this._editorData = {_class: 'StyledText', string: '', tags: []}
        this._loadedId = ''
      }
    }
  }

  async _loadPost() {
    this.loading = true
    const id = this.grampsId
    try {
      const result = await this.appState.apiGet(
        `/api/sources/?gramps_id=${encodeURIComponent(id)}`
      )
      if ('error' in result) throw new Error(result.error)
      const source = result.data[0]
      if (!source) throw new Error(this._('Not found'))
      if (
        !source.attribute_list?.some(
          attribute =>
            (attribute.type?.string || attribute.type) === 'Blog author' &&
            attribute.value === this.appState.auth?.claims?.sub
        )
      )
        throw new Error(this._('Not authorized'))
      let note = null
      if (source.note_list.length) {
        const response = await this.appState.apiGet(
          `/api/notes/${source.note_list[0]}`
        )
        if ('error' in response) throw new Error(response.error)
        note = response.data
      }
      if (this.grampsId !== id) return
      this._originalSource = source
      this._originalNote = note
      this._editorData = note?.text || {
        _class: 'StyledText',
        string: '',
        tags: [],
      }
      this.data = {...source, ...(note ? {note} : {})}
      this._loadedId = `${id}:${Date.now()}`
      this.error = false
    } catch (error) {
      this.error = true
      this._errorMessage = error.message
    } finally {
      this.loading = false
    }
  }

  async _savePost() {
    const wasPublished = !this._originalSource.private
    const {note, ...source} = this.data
    const changes = []
    if (note) {
      const savedNote = {
        ...note,
        private: !!source.private,
        tag_list: source.tag_list,
        handle: this._originalNote?.handle || makeHandle(),
      }
      if (!this._originalNote)
        source.note_list = [...(source.note_list || []), savedNote.handle]
      changes.push({
        type: this._originalNote ? 'update' : 'add',
        _class: 'Note',
        handle: savedNote.handle,
        old: this._originalNote,
        new: savedNote,
      })
    }
    changes.push({
      type: 'update',
      _class: 'Source',
      handle: source.handle,
      old: this._originalSource,
      new: source,
    })
    const result = await this.appState.apiPost(
      '/api/transactions/?simplified=1&message=Edit%20blog%20post',
      changes
    )
    if ('error' in result) throw new Error(result.error)
    this._clearDrafts()
    if (this._savingDraft || wasPublished) {
      this._savedNotice = this._(
        this._savingDraft
          ? wasPublished
            ? 'Post unpublished'
            : 'Draft saved'
          : 'Changes saved'
      )
      await this._loadPost()
    } else fireEvent(this, 'nav', {path: `blog/${source.gramps_id}`})
  }

  renderButtons() {
    return html`<div class="spacer"></div>
      <p class="right">
        <md-outlined-button @click=${this._reset}
          >${this._('Reset')}</md-outlined-button
        ><md-outlined-button
          ?disabled=${this._isSaving}
          @click=${this._saveDraft}
          >${this._(
            this._originalSource && !this._originalSource.private
              ? 'Unpublish'
              : 'Save draft'
          )}</md-outlined-button
        ><md-filled-button ?disabled=${this._isSaving} @click=${this._submit}
          >${this._(
            this._originalSource && !this._originalSource.private
              ? 'Save'
              : 'Publish'
          )}</md-filled-button
        >
      </p>`
  }

  _validateTitle() {
    const field = this.shadowRoot.getElementById('source-name')
    field.setCustomValidity(
      field.value.trim() ? '' : this._('This field is mandatory')
    )
    return field.reportValidity()
  }

  _submit() {
    return this._save(false)
  }

  _saveDraft() {
    return this._save(true)
  }

  async _save(draft) {
    if (this._isSaving || (!draft && !this._validateTitle())) {
      return
    }
    this._savingDraft = draft
    this._savedNotice = ''
    this.data = {...this.data, title: this.data.title?.trim(), private: draft}
    this._isSaving = true
    try {
      if (!this._blogTagHandle) {
        await this._fetchBlogTagHandle()
      }
      if (!this._blogTagHandle) {
        const errorMessage = await this._createBlogTag()
        if (errorMessage) {
          this.error = true
          this._errorMessage = errorMessage
          return
        }
      }
      if (draft && !this._draftTagHandle) {
        const result = await this.appState.apiPost('/api/tags/', {
          name: 'Blog Draft',
        })
        if ('error' in result) throw new Error(result.error)
        await this._fetchBlogTagHandle()
        if (!this._draftTagHandle)
          throw new Error(this._('Failed to fetch the Blog tag'))
      }
      this.data = {
        ...this.data,
        tag_list: [
          ...new Set([
            ...(this.data.tag_list || []).filter(
              handle =>
                ![this._blogTagHandle, this._draftTagHandle].includes(handle)
            ),
            draft ? this._draftTagHandle : this._blogTagHandle,
          ]),
        ],
      }
      if (this.grampsId) {
        await this._savePost()
        return
      }
      const userId = this.appState.auth?.claims?.sub
      if (userId) {
        const result = await this.appState.apiGet('/api/users/-/')
        if ('error' in result) throw new Error(result.error)
        this.data = {
          ...this.data,
          author: result.data.full_name || result.data.name,
          attribute_list: [
            ...(this.data.attribute_list || []),
            {
              _class: 'SrcAttribute',
              type: 'Blog author',
              value: userId,
              private: false,
            },
          ],
        }
      }
      const processedData = this._processedData(this.data.media_list || [])
      const data = await this.appState.apiPost(this.postUrl, processedData)
      if ('data' in data) {
        this.error = false
        const grampsId = data.data.filter(
          obj => obj.new._class === this.objClass
        )[0].new.gramps_id
        const {page, pageId} = this.appState?.path || {page: '', pageId: ''}
        clearDraftsWithPrefix(`${page}:${pageId}:`)
        fireEvent(this, 'nav', {
          path: draft
            ? `new_blog_post/${grampsId}`
            : this._getItemPath(grampsId),
        })
        this._reset()
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    } catch (error) {
      this.error = true
      this._errorMessage = error.message
    } finally {
      this._isSaving = false
    }
  }
}

window.customElements.define(
  'grampsjs-view-new-blog-post',
  GrampsjsViewNewBlogPost
)
