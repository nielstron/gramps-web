import {html} from 'lit'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import {GrampsjsNewPersonMixin} from '../mixins/GrampsjsNewPersonMixin.js'
import {PERSON_PICKER_CREATED_EVENT} from '../personPicker.js'

export class GrampsjsViewNewPerson extends GrampsjsNewPersonMixin(
  GrampsjsViewNewObject
) {
  constructor() {
    super()
    this.postUrl = '/api/objects/'
    this.itemPath = 'person'
    this.objClass = 'Person'
    this._personPickerRequestId = ''
  }

  update(changed) {
    if (changed.has('active') && this.active) {
      this._applyNavigationPrefill()
    }
    super.update(changed)
  }

  _applyNavigationPrefill() {
    const {personPickerRequestId = '', newPersonName} =
      window.history.state ?? {}
    if (!personPickerRequestId || !newPersonName) return
    this._personPickerRequestId = personPickerRequestId
    this.data = {...this.data, primary_name: newPersonName}
    this.updateComplete.then(() => this.checkFormValidity())
  }

  renderContent() {
    return html`
      <h2>${this._('New Person')}</h2>
      ${this.renderForm()} ${this.renderButtons()}
    `
  }

  async _submit() {
    const processedData = this._processedData()
    const data = await this.appState.apiPost(this.postUrl, processedData)
    if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
      return
    }

    this.error = false
    const created = data.data.find(obj => obj.new._class === 'Person').new
    if (this._personPickerRequestId) {
      const result = await this.appState.apiGet(
        `/api/people/${created.handle}?extend=all&profile=all&locale=${
          this.appState.i18n.lang || 'en'
        }`
      )
      if ('error' in result) {
        this.error = true
        this._errorMessage = result.error
        return
      }
      window.dispatchEvent(
        new CustomEvent(PERSON_PICKER_CREATED_EVENT, {
          detail: {
            requestId: this._personPickerRequestId,
            object: result.data,
          },
        })
      )
      this._personPickerRequestId = ''
      this._reset()
      window.history.back()
      return
    }

    this.dispatchEvent(
      new CustomEvent('nav', {
        bubbles: true,
        composed: true,
        detail: {path: this._getItemPath(created.gramps_id)},
      })
    )
    this._reset()
  }
}

window.customElements.define('grampsjs-view-new-person', GrampsjsViewNewPerson)
