import {html, css} from 'lit'

import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'
import '@material/web/button/outlined-button.js'
import '@material/web/button/filled-button.js'

import {mdiArrowLeft, mdiClose, mdiContentSave} from '@mdi/js'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsIcon.js'
import {clearDraftsWithPrefix} from '../api.js'
import {GrampsjsNewObjectTagsMixin} from '../mixins/GrampsjsNewObjectTagsMixin.js'
import {fireEvent, objectTypeToEndpoint} from '../util.js'
import {
  OBJECT_PICKER_CANCELLED_EVENT,
  OBJECT_PICKER_CREATED_EVENT,
} from '../objectPicker.js'

export class GrampsjsViewNewObject extends GrampsjsNewObjectTagsMixin(
  GrampsjsView
) {
  static get styles() {
    return [
      super.styles,
      css`
        div.spacer {
          margin-top: 2em;
        }

        p.right {
          text-align: right;
        }

        h3 {
          font-size: 1.35em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      types: {type: Object},
      typesLocale: {type: Object},
      loadingTypes: {type: Boolean},
      postUrl: {type: String},
      itemPath: {type: String},
      objClass: {type: String},
      isFormValid: {type: Boolean},
      objectPickerRequest: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.types = {}
    this.typesLocale = {}
    this.loadingTypes = false
    this.postUrl = ''
    this.itemPath = ''
    this.objClass = ''
    this.isFormValid = false
    this.objectPickerRequest = null
    this._objectPickerRequest = null
    this._appliedObjectPickerRequestId = ''
    this._boundHandleOwnedFormData = event => {
      event.stopPropagation()
      this._handleFormData(event)
    }
  }

  update(changed) {
    if (
      this.active &&
      (changed.has('active') || changed.has('objectPickerRequest'))
    ) {
      this._applyObjectPickerRequest()
    }
    super.update(changed)
    if (changed.has('active') && this.active) {
      this._updateData()
    }
  }

  _applyObjectPickerRequest() {
    const request = this.objectPickerRequest
    if (
      !request ||
      request.objectType !== this.itemPath ||
      request.id === this._appliedObjectPickerRequestId
    ) {
      return
    }
    this._objectPickerRequest = request
    this._appliedObjectPickerRequestId = request.id
    this._applyPickerPrefill(request.query ?? '')
    this.updateComplete.then(() => this.checkFormValidity?.())
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  _applyPickerPrefill(query) {}

  // eslint-disable-next-line class-methods-use-this
  _reset() {
    this.shadowRoot
      .querySelectorAll(
        [
          'grampsjs-form-select-type',
          'grampsjs-form-private',
          'grampsjs-form-object-list',
          'grampsjs-form-select-object',
          'grampsjs-form-select-object-list',
          'grampsjs-form-select-date',
          'grampsjs-form-string',
          'grampsjs-form-upload',
          'grampsjs-form-name',
        ].join(', ')
      )
      .forEach(element => element.reset())
    this.shadowRoot.querySelectorAll('mwc-textfield').forEach(element => {
      // eslint-disable-next-line no-param-reassign
      element.value = ''
    })
    this.isFormValid = false
  }

  async _submit() {
    const data = await this.appState.apiPost(this.postUrl, this.data)
    if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
      return
    }
    this.error = false
    const created = data.data.find(obj => obj.new._class === this.objClass).new
    this._clearDrafts()
    await this._handleCreatedObjects([created])
  }

  _clearDrafts() {
    const {page, pageId} = this.appState?.path || {page: '', pageId: ''}
    clearDraftsWithPrefix(`${page}:${pageId}:`)
  }

  async _handleCreatedObjects(createdObjects) {
    if (!this._objectPickerRequest) {
      const [created] = createdObjects
      fireEvent(this, 'nav', {
        path: this._getItemPath(created.gramps_id),
      })
      this._reset()
      return
    }

    const endpoint = objectTypeToEndpoint[this._objectPickerRequest.objectType]
    const objects = []
    for (const created of createdObjects) {
      // Fetch the complete profile expected by object selectors.
      // eslint-disable-next-line no-await-in-loop
      const result = await this.appState.apiGet(
        `/api/${endpoint}/${created.handle}?extend=all&profile=all&locale=${
          this.appState.i18n.lang || 'en'
        }`
      )
      if ('error' in result) {
        this.error = true
        this._errorMessage = result.error
        return
      }
      objects.push(result.data)
    }

    const {id: requestId, objectType} = this._objectPickerRequest
    window.dispatchEvent(
      new CustomEvent(OBJECT_PICKER_CREATED_EVENT, {
        detail: {requestId, objectType, objects},
      })
    )
    this._clearObjectPickerRequest()
    this._reset()
  }

  _cancelObjectPickerCreation() {
    const requestId = this._objectPickerRequest?.id
    if (!requestId) return
    window.dispatchEvent(
      new CustomEvent(OBJECT_PICKER_CANCELLED_EVENT, {detail: {requestId}})
    )
    this._clearObjectPickerRequest()
    this._reset()
  }

  _clearObjectPickerRequest() {
    this._objectPickerRequest = null
    this._appliedObjectPickerRequestId = ''
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `${this.itemPath}/${grampsId}`
  }

  renderButtons() {
    return html`
      <div class="spacer"></div>
      <p class="right">
        <md-outlined-button @click="${this._reset}">
          <grampsjs-icon
            slot="icon"
            path="${mdiClose}"
            color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
          ></grampsjs-icon>
          ${this._('Reset')}
        </md-outlined-button>
        ${this._objectPickerRequest
          ? html`
              <md-outlined-button @click="${this._cancelObjectPickerCreation}">
                <grampsjs-icon
                  slot="icon"
                  path="${mdiArrowLeft}"
                  color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
                ></grampsjs-icon>
                ${this._('Cancel')}
              </md-outlined-button>
            `
          : ''}
        <md-filled-button
          @click="${this._submit}"
          ?disabled=${!this.isFormValid}
        >
          <grampsjs-icon
            slot="icon"
            path="${mdiContentSave}"
            color="var(--md-filled-button-label-text-color, var(--mdc-theme-on-primary))"
          ></grampsjs-icon>
          ${this._('Add')}
        </md-filled-button>
      </p>
    `
  }

  _renderCitationForm() {
    return html`
      <h3>${this._('Citation')}</h3>

      <grampsjs-form-select-object-list
        multiple
        id="object-citation"
        objectType="citation"
        .appState="${this.appState}"
      ></grampsjs-form-select-object-list>
    `
  }

  _updateData() {
    this.loading = true
    this.loadingTypes = true
    this.appState
      .apiGet('/api/types/')
      .then(data => {
        this.loading = false
        if ('data' in data) {
          this.types = data.data || {}
          this.error = false
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
      .then(() => {
        this.loading = true
        this.appState.apiGet('/api/types/?locale=1').then(data => {
          this.loading = false
          this.loadingTypes = false
          if ('data' in data) {
            this.typesLocale = data.data || {}
            this.error = false
          } else if ('error' in data) {
            this.error = true
            this._errorMessage = data.error
          }
        })
      })
  }

  translateTypeName(isCustom, typeKey, string) {
    const types =
      (this.types[isCustom ? 'custom' : 'default'] || {})[typeKey] || []
    const ind = types.indexOf(string)
    if (ind < 0) return string
    try {
      return this.typesLocale[isCustom ? 'custom' : 'default'][typeKey][ind]
    } catch {
      return string
    }
  }

  connectedCallback() {
    super.connectedCallback()
    this.addEventListener('formdata:changed', this._boundHandleOwnedFormData)
  }

  disconnectedCallback() {
    this.removeEventListener('formdata:changed', this._boundHandleOwnedFormData)
    super.disconnectedCallback()
  }

  _handleFormData(e) {
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'private') {
      this.data = {...this.data, private: e.detail.checked}
    }
    if (
      ['author', 'pubinfo', 'abbrev', 'page', 'desc', 'description'].includes(
        originalTarget.id
      )
    ) {
      this.data = {...this.data, [originalTarget.id]: e.detail.data}
    }
    if (originalTarget.id === 'object-citation-list') {
      this.data = {
        ...this.data,
        citation_list: e.detail.data ?? [],
      }
    }
  }
}
