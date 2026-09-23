/*
Element for selecting a Gramps object
*/

import {html, css, LitElement} from 'lit'

import '@material/web/button/outlined-button.js'

import {mdiLinkPlus, mdiPlus} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'

import {fireEvent, makeHandle, objectTypeToEndpoint} from '../util.js'
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

// labels for the create button, for the object types that support allowNew
const newBtnLabel = {
  place: 'Add a new place',
}

const newDialogTitle = {
  place: 'New Place',
}

class GrampsjsFormSelectObject extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      objectType: {type: String},
      objects: {type: Array},
      suggestedObjects: {type: Array},
      multiple: {type: Boolean},
      label: {type: String},
      disabled: {type: Boolean},
      hideButton: {type: Boolean},
      initialQuery: {type: String},
      iconPath: {type: String},
      allowNew: {type: Boolean},
      _newObjectDialogOpen: {type: Boolean, state: true},
      _creatingObject: {type: Boolean, state: true},
    }
  }

  constructor() {
    super()
    this.objectType = ''
    this.objects = []
    this.suggestedObjects = []
    this.multiple = false
    this.label = ''
    this.disabled = false
    this.hideButton = false
    this.initialQuery = ''
    this.iconPath = mdiLinkPlus
    this.allowNew = false
    this._newObjectDialogOpen = false
    this._creatingObject = false
  }

  render() {
    return html`
      <div class="buttons">
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
        ${this._canCreate()
          ? html`
              <md-outlined-button
                ?disabled="${this.disabled}"
                @click="${this._handleNewBtnClick}"
              >
                <grampsjs-icon
                  slot="icon"
                  path="${mdiPlus}"
                  color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
                ></grampsjs-icon>
                ${this._(newBtnLabel[this.objectType])}
              </md-outlined-button>
            `
          : ''}
      </div>

      <grampsjs-object-picker-dialog
        objectType="${this.objectType}"
        ?multiple="${this.multiple}"
        .excludeHandles="${this._handleList()}"
        .suggestedObjects="${this.suggestedObjects}"
        .appState="${this.appState}"
        @select-object:selected="${this._handleSelected}"
      ></grampsjs-object-picker-dialog>

      ${this._newObjectDialogOpen ? this._renderNewObjectDialog() : ''}
    `
  }

  // The create form contains object selectors of its own (e.g. Enclosed By),
  // whose select-object:changed events would otherwise bubble out of this
  // element and be taken as a change of this selector.
  _renderNewObjectDialog() {
    return html`
      <div
        @object:save="${this._handleNewObjectSave}"
        @object:cancel="${this._handleNewObjectCancel}"
        @select-object:changed="${this._stopPropagation}"
      >
        ${this.objectType === 'place'
          ? html`
              <grampsjs-form-new-place
                noReset
                .appState="${this.appState}"
                dialogTitle="${this._(newDialogTitle[this.objectType])}"
              ></grampsjs-form-new-place>
            `
          : ''}
      </div>
    `
  }

  _canCreate() {
    return (
      this.allowNew &&
      !this.hideButton &&
      this.objectType in newBtnLabel &&
      !!this.appState?.permissions?.canAdd
    )
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
    this._selectObject(obj)
  }

  _selectObject(obj) {
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

  async _handleNewBtnClick() {
    // The place form contains object selectors itself. Load it only when it is
    // needed so that the two custom-element modules do not form an ESM cycle.
    await import('./GrampsjsFormNewPlace.js')
    this._newObjectDialogOpen = true
  }

  // The modal dialog stays open until the object is created and selected, so
  // the enclosing form cannot be submitted without it in the meantime.
  async _handleNewObjectSave(e) {
    e.preventDefault()
    e.stopPropagation()
    if (this._creatingObject) return
    this._creatingObject = true
    const {objectType} = this
    const handle = makeHandle()
    const payload = {...e.detail.data, handle}
    let data
    try {
      data = await this.appState.apiPost(
        `/api/${objectTypeToEndpoint[objectType]}/`,
        payload
      )
    } finally {
      this._creatingObject = false
    }
    if (!('data' in data)) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
      return
    }
    this._newObjectDialogOpen = false
    // The form holding this selector may have been closed during the request.
    if (!this.isConnected) return
    const object =
      data.data.find(obj => obj.new?.handle === handle)?.new ?? payload
    this._selectObject({object_type: objectType, handle, object})
  }

  _handleNewObjectCancel(e) {
    e.preventDefault()
    e.stopPropagation()
    if (this._creatingObject) return
    this._newObjectDialogOpen = false
  }

  // eslint-disable-next-line class-methods-use-this
  _stopPropagation(e) {
    e.stopPropagation()
  }
}

window.customElements.define(
  'grampsjs-form-select-object',
  GrampsjsFormSelectObject
)
