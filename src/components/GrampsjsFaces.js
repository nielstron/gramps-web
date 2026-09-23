import {html, css} from 'lit'
import '@material/web/progress/circular-progress.js'

import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import './GrampsjsRectContainer.js'
import './GrampsjsRect.js'
import {fireEvent, arrayEqual, normalizeRect} from '../util.js'

export class GrampsjsFaces extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          position: relative;
        }
        .status {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 6px;
          line-height: normal;
          background: var(--md-sys-color-surface);
          color: var(--md-sys-color-on-surface);
          font-size: 12px;
        }
        md-circular-progress {
          width: 18px;
          height: 18px;
        }
      `,
    ]
  }

  renderLoading() {
    // Keep the image's slot mounted while only the detection data loads.
    return this.renderContent()
  }

  renderContent() {
    return html`
      <grampsjs-rect-container .appState="${this.appState}">
        <slot></slot>
        ${this.rectHidden
          ? ''
          : this._getFaces().map(obj =>
              arrayEqual(obj, this.selectedRect) ||
              this.deletedRects.some(el => arrayEqual(obj, el))
                ? ''
                : html`
                    <grampsjs-rect
                      muted
                      .rect="${obj}"
                      label="?"
                      target=""
                      @click="${() => this._handleRectClick(obj)}"
                    >
                    </grampsjs-rect>
                  `
            )}
      </grampsjs-rect-container>
      ${this.loading
        ? html`<div class="status" role="status">
            <md-circular-progress indeterminate></md-circular-progress>
            ${this._('Detecting faces…')}
          </div>`
        : ''}
    `
  }

  handleUpdateStaleData() {
    // Person annotations do not change the image pixels or detected faces.
    // Refresh only when the handle or file checksum changes.
  }

  update(changed) {
    super.update(changed)
    if (changed.has('checksum') && !changed.has('handle')) this._updateData()
  }

  async _updateData() {
    const requestId = ++this._requestId
    const url = this.getUrl()
    this._oldUrl = url
    this.loading = true
    this._clearData()
    const result = await this.appState.apiGet(url)
    if (requestId !== this._requestId) return
    if ('data' in result) {
      this._data = {data: result.data}
      this.error = false
      this._fireUpdateEvent()
    } else if ('error' in result) {
      this.error = true
      this._errorMessage = result.error
      this._errorDetail = result.errorDetail ?? {}
    }
    this.loading = false
  }

  updated(changed) {
    super.updated(changed)
    if (changed.has('_data') && this._data.data) {
      fireEvent(this, 'faces:detected', {rects: this._getFaces()})
    }
  }

  _handleRectClick(obj) {
    fireEvent(this, 'rect:selected', obj)
  }

  // slightly grow rectangles and make them rectangular
  _getFaces() {
    if (!this._data.data) {
      return []
    }
    return this._data.data
      .map(rect => {
        const [left, top, right, bottom] = rect
        const width = right - left
        const height = bottom - top
        return [
          Math.round(left - 0.15 * width),
          Math.round(top - 0.37 * height),
          Math.round(right + 0.15 * width),
          Math.round(bottom + 0.37 * height),
        ]
      })
      .map(normalizeRect)
      .filter(rect => rect !== null)
  }

  static get properties() {
    return {
      handle: {type: String},
      checksum: {type: String},
      selectedRect: {type: Array},
      deletedRects: {type: Array},
      rectHidden: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.handle = ''
    this.checksum = ''
    this._requestId = 0
    this.selectedRect = []
    this.deletedRects = []
    this.rectHidden = false
    this.renderOnError = true // render even if face detection fails
  }

  getUrl() {
    return `/api/media/${this.handle}/face_detection`
  }
}

window.customElements.define('grampsjs-faces', GrampsjsFaces)
