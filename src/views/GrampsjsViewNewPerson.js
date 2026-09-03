import {html} from 'lit'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import {GrampsjsNewPersonMixin} from '../mixins/GrampsjsNewPersonMixin.js'
import {personNameFromQuery} from '../objectPicker.js'

export class GrampsjsViewNewPerson extends GrampsjsNewPersonMixin(
  GrampsjsViewNewObject
) {
  constructor() {
    super()
    this.postUrl = '/api/objects/'
    this.itemPath = 'person'
    this.objClass = 'Person'
  }

  _applyPickerPrefill(query) {
    if (!query.trim()) return
    this.data = {...this.data, primary_name: personNameFromQuery(query)}
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
    await this._handleCreatedObjects([created])
  }
}

window.customElements.define('grampsjs-view-new-person', GrampsjsViewNewPerson)
