import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import '../components/GrampsjsMediaObject.js'

export class GrampsjsViewMedia extends GrampsjsViewObject {
  static get properties() {
    return {
      dbInfo: {type: Object},
    }
  }

  constructor() {
    super()
    this.dbInfo = {}
    this._className = 'media'
  }

  getUrl() {
    return `/api/media/?gramps_id=${this.grampsId}&locale=${
      this.appState.i18n.lang || 'en'
    }&backlinks=true&extend=all&profile=all`
  }

  renderElement() {
    return html`
      <grampsjs-media-object
        .data=${this._data}
        .appState="${this.appState}"
        .dbInfo=${this.dbInfo}
        ?canEdit="${this.canEdit}"
        ?edit="${this.edit}"
        @annotations:changed="${() => this._updateData(false)}"
        @file:replace="${this._handleUploadFile}"
      ></grampsjs-media-object>
    `
  }

  _handleUploadFile(e) {
    const putUrl = `/api/media/${e.detail.handle}/file`
    this.appState.apiPut(putUrl, e.detail.data, {isJson: false}).then(data => {
      if ('data' in data) {
        this.error = false
        this._updateData()
        this._reloadImage()
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }

  _reloadImage() {
    this.renderRoot
      .querySelectorAll(`grampsjs-media-object`)
      .forEach(obj => obj.reloadImage())
  }
}

window.customElements.define('grampsjs-view-media', GrampsjsViewMedia)
