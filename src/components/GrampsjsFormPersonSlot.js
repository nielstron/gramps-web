import {html, css, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormSelectType.js'

class _PersonSlotBase extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .rel-types {
          display: flex;
          gap: 1em;
          flex-wrap: wrap;
        }

        .rel-types > * {
          flex: 1;
          min-width: 12em;
        }
      `,
    ]
  }
}

export class GrampsjsFormPersonSlot extends _PersonSlotBase {
  static get properties() {
    return {
      showRelTypes: {type: Boolean},
      types: {type: Object},
      typesLocale: {type: Object},
      loadingTypes: {type: Boolean},
      _selectedHandles: {type: Array, state: true},
      _frel: {type: Object, state: true},
      _mrel: {type: Object, state: true},
    }
  }

  constructor() {
    super()
    this.showRelTypes = false
    this.types = {}
    this.typesLocale = {}
    this.loadingTypes = false
    this._selectedHandles = []
    this._frel = null
    this._mrel = null
  }

  connectedCallback() {
    super.connectedCallback()
    this._boundHandleFormData = this._handleFormData.bind(this)
    this.addEventListener('formdata:changed', this._boundHandleFormData)
  }

  disconnectedCallback() {
    this.removeEventListener('formdata:changed', this._boundHandleFormData)
    super.disconnectedCallback()
  }

  render() {
    return html`
      <grampsjs-form-select-object-list
        id="person-in-slot"
        objectType="person"
        .appState="${this.appState}"
      ></grampsjs-form-select-object-list>
      ${this.showRelTypes ? this._renderRelTypes() : ''}
    `
  }

  _renderRelTypes() {
    return html`
      <div class="rel-types">
        <grampsjs-form-select-type
          required
          id="child-frel"
          heading="${this._('Relationship to _Father:').replace(':', '')}"
          .appState="${this.appState}"
          ?loadingTypes="${this.loadingTypes}"
          typeName="child_reference_types"
          defaultValue="Birth"
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
        ></grampsjs-form-select-type>
        <grampsjs-form-select-type
          required
          id="child-mrel"
          heading="${this._('Relationship to _Mother:').replace(':', '')}"
          .appState="${this.appState}"
          ?loadingTypes="${this.loadingTypes}"
          typeName="child_reference_types"
          defaultValue="Birth"
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
        ></grampsjs-form-select-type>
      </div>
    `
  }

  _handleFormData(e) {
    // Re-dispatched slot-level pings are for the parent's benefit only.
    if (e.composedPath()[0] === this) return
    // Stop the original shadow-internal event here so its generic ids
    // (e.g. 'private', 'object-citation-list') cannot collide with identically
    // named fields on ancestor forms.
    e.stopPropagation()
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'person-in-slot-list') {
      this._selectedHandles = e.detail.data ?? []
    }
    if (originalTarget.id === 'child-frel') {
      this._frel = e.detail.data
    }
    if (originalTarget.id === 'child-mrel') {
      this._mrel = e.detail.data
    }
    // Re-dispatch from the slot element so ancestors can recheck validity.
    // composedPath()[0] will be the slot itself, whose id never matches any
    // ancestor form field.
    fireEvent(this, 'formdata:changed', {})
  }

  // Returns the slot's data at submit time. Called once by the parent view.
  getData() {
    if (!this._selectedHandles.length) return null
    return {
      handle: this._selectedHandles[0],
      frel: this._frel,
      mrel: this._mrel,
    }
  }

  isEmpty() {
    return this._selectedHandles.length === 0
  }

  // Called by the parent view to check whether inline forms are valid.
  checkValidity() {
    let valid = true
    if (valid && this.showRelTypes) {
      this.shadowRoot
        ?.querySelectorAll('#child-frel, #child-mrel')
        .forEach(el => {
          if (!el.isValid()) valid = false
        })
    }
    return valid
  }

  reset() {
    this._selectedHandles = []
    this._frel = null
    this._mrel = null
    if (this.shadowRoot) {
      this.shadowRoot
        .querySelectorAll(
          [
            'grampsjs-form-select-type',
            'grampsjs-form-object-list',
            'grampsjs-form-select-object',
            'grampsjs-form-select-object-list',
          ].join(', ')
        )
        .forEach(el => el.reset())
    }
  }
}

window.customElements.define(
  'grampsjs-form-person-slot',
  GrampsjsFormPersonSlot
)
