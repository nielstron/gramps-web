import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import {fireEvent, makeHandle} from '../util.js'
import {renderIcon} from '../objectRender.js'
import './GrampsjsFormCitation.js'
import './GrampsjsFormNewCitation.js'

export class GrampsjsSourceCitations extends GrampsjsEditableList {
  static get properties() {
    return {
      ...super.properties,
      source: {type: Object},
    }
  }

  constructor() {
    super()
    this.objType = 'Citation'
    this.hasReorder = true
    this.reorderAction = 'reorderCitation'
    this.source = undefined
  }

  row(obj, i) {
    return html`
      <md-list-item
        type="button"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          } else {
            this._handleClick(obj.gramps_id)
          }
        }}"
      >
        ${obj?.profile?.source?.title || this._('Source')}
        <span slot="supporting-text"> ${obj.page || obj.gramps_id} </span>
        ${renderIcon({object: obj, object_type: 'citation'}, 'start')}
        ${this._renderDragHandle(i)}
      </md-list-item>
    `
  }

  _handleClick(grampsId) {
    if (!this.edit && grampsId !== this.grampsId) {
      this.dispatchEvent(
        new CustomEvent('nav', {
          bubbles: true,
          composed: true,
          detail: {path: this._getItemPath(grampsId)},
        })
      )
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `citation/${grampsId}`
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-new-citation
        new
        .data=${this._newCitationData()}
        .source=${this.source}
        @object:save="${this._handleCitSave}"
        @object:cancel="${this._handleCitCancel}"
        .appState="${this.appState}"
        dialogTitle=${this._('New Citation')}
      >
      </grampsjs-form-new-citation>
    `
  }

  _newCitationData() {
    return {
      _class: 'Citation',
      confidence: 2,
      ...(this.source?.handle ? {source_handle: this.source.handle} : {}),
    }
  }

  _handleShare() {
    this.dialogContent = html`
      <grampsjs-form-citation
        new
        @object:save="${this._handleShareCitSave}"
        @object:cancel="${this._handleCitCancel}"
        .appState="${this.appState}"
        dialogTitle=${this._('Select an existing citation')}
      >
      </grampsjs-form-citation>
    `
  }

  _handleCitSave(e) {
    const handle = makeHandle()
    fireEvent(this, 'edit:action', {
      action: 'newCitation',
      data: {handle, ...e.detail.data},
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleShareCitSave(e) {
    fireEvent(this, 'edit:action', {action: 'addCitation', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleUp() {
    const handle = this.data?.[this._selectedIndex]?.handle
    if (handle) {
      fireEvent(this, 'edit:action', {action: 'upCitation', handle})
      this._updateSelectionAfterReorder(true)
    }
  }

  _handleDown() {
    const handle = this.data?.[this._selectedIndex]?.handle
    if (handle) {
      fireEvent(this, 'edit:action', {action: 'downCitation', handle})
      this._updateSelectionAfterReorder(false)
    }
  }

  _handleDelete(e) {
    const handle = this.data?.[this._selectedIndex]?.handle
    if (handle) {
      fireEvent(this, 'edit:action', {action: 'delCitation', handle})
    }
    e.preventDefault()
    e.stopPropagation()
  }

  _handleCitCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define(
  'grampsjs-source-citations',
  GrampsjsSourceCitations
)
