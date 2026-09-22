import {html} from 'lit'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import {GrampsjsNewPlaceMixin} from '../mixins/GrampsjsNewPlaceMixin.js'

export class GrampsjsViewNewPlace extends GrampsjsNewPlaceMixin(
  GrampsjsViewNewObject
) {
  constructor() {
    super()
    this.postUrl = '/api/places/'
    this.itemPath = 'place'
    this.objClass = 'Place'
  }

  renderContent() {
    return html`
      <h2>${this._('New Place')}</h2>
      ${this.renderForm()} ${this.renderButtons()}
    `
  }

  _applyPickerPrefill(query) {
    if (!query.trim()) return
    this.data = {
      ...this.data,
      name: {_class: 'PlaceName', value: query.trim()},
    }
  }

  _closeLatLongDialog(e) {
    this._latLongDialogOpen = false
    e?.preventDefault()
    e?.stopPropagation()
  }

  _handleLatLongSave(e) {
    this.data = {...this.data, ...e.detail.data}
    this._latLongDialogOpen = false
    e.preventDefault()
    e.stopPropagation()
  }

  _reset() {
    super._reset()
    this.data = {_class: 'Place'}
    this._latLongDialogOpen = false
  }
}

window.customElements.define('grampsjs-view-new-place', GrampsjsViewNewPlace)
