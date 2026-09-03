/*
Element for selecting a Gramps object
*/

import {html, css, LitElement} from 'lit'

import '@material/web/button/outlined-button.js'

import {mdiLinkPlus} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'

import {fireEvent} from '../util.js'
import './GrampsjsObjectPickerDialog.js'
import './GrampsjsIcon.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

// labels for button
export const objectPickerButtonLabel = {
  person: 'Add or link person',
  family: 'Add or link family',
  event: 'Add or link event',
  place: 'Add or link place',
  source: 'Add or link source',
  citation: 'Add or link citation',
  repository: 'Add or link repository',
  note: 'Add or link note',
  media: 'Add or link media object',
}

class GrampsjsFormSelectObject extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [sharedStyles, css``]
  }

  static get properties() {
    return {
      objectType: {type: String},
      objects: {type: Array},
      multiple: {type: Boolean},
      label: {type: String},
      disabled: {type: Boolean},
      hideButton: {type: Boolean},
      initialQuery: {type: String},
      iconPath: {type: String},
    }
  }

  constructor() {
    super()
    this.objectType = ''
    this.objects = []
    this.multiple = false
    this.label = ''
    this.disabled = false
    this.hideButton = false
    this.initialQuery = ''
    this.iconPath = mdiLinkPlus
  }

  render() {
    return html`
      <md-outlined-button
        ?disabled="${this.disabled}"
        style="${this.hideButton ? 'display:none;' : ''}"
        @click="${this._handleBtnClick}"
      >
        <grampsjs-icon
          slot="icon"
          path="${this.iconPath}"
          color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
        ></grampsjs-icon>
        ${this.label ||
        this._(objectPickerButtonLabel[this.objectType] || 'Add or link')}
      </md-outlined-button>

      <grampsjs-object-picker-dialog
        objectType="${this.objectType}"
        ?multiple="${this.multiple}"
        .excludeHandles="${this._handleList()}"
        .appState="${this.appState}"
        @select-object:selected="${this._handleSelected}"
      ></grampsjs-object-picker-dialog>
    `
  }

  reset() {
    this.objects = []
  }

  _handleList() {
    return this.objects
      .map(_obj => _obj.handle ?? _obj.object?.handle)
      .filter(Boolean)
  }

  _handleSelected(e) {
    // A picker can contain forms with their own nested object pickers (for
    // example, creating a citation includes selecting its source). Composed
    // events from those nested pickers also reach this listener on the outer
    // dialog host, so only accept events emitted by this dialog itself.
    if (
      (e.detail.picker_id && e.detail.picker_id !== e.currentTarget.pickerId) ||
      (!e.detail.picker_id && e.composedPath()[0] !== e.currentTarget)
    ) {
      return
    }
    e.stopPropagation?.()
    const obj = {...e.detail}
    delete obj.picker_id
    const handle = obj.handle ?? obj.object?.handle
    if (!this.multiple) {
      this.objects = [obj]
      fireEvent(this, 'select-object:changed', {objects: this.objects})
    } else if (!this._handleList().includes(handle)) {
      this.objects = [...this.objects, obj]
      fireEvent(this, 'select-object:changed', {objects: this.objects})
    }
  }

  open() {
    const query = this.initialQuery
    this.initialQuery = ''
    this.renderRoot.querySelector('grampsjs-object-picker-dialog')?.open(query)
  }

  _handleBtnClick() {
    this.open()
  }
}

window.customElements.define(
  'grampsjs-form-select-object',
  GrampsjsFormSelectObject
)
