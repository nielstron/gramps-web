import {html, css} from 'lit'

import {mdiClose, mdiPlus} from '@mdi/js'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsFormPersonSlot.js'
import '../components/GrampsjsIcon.js'
import '@material/web/button/outlined-button.js'
import '@material/web/iconbutton/icon-button.js'

const dataDefault = {_class: 'Family'}

export class GrampsjsViewNewFamily extends GrampsjsViewNewObject {
  static get styles() {
    return [
      super.styles,
      css`
        .child-slot-wrapper {
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          padding: 1em 1.25em;
          margin-bottom: 1em;
        }

        .child-slot-header {
          display: flex;
          justify-content: flex-end;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _childKeys: {type: Array, state: true},
    }
  }

  constructor() {
    super()
    this.data = dataDefault
    this.postUrl = '/api/objects/'
    this.itemPath = 'family'
    this.objClass = 'Family'
    this._childKeys = []
    this._nextChildKey = 0
  }

  renderContent() {
    return html`
      <h2>${this._('New Family')}</h2>

      <h3>${this._('Father')}</h3>

      <grampsjs-form-person-slot
        id="father-slot"
        .appState="${this.appState}"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        ?loadingTypes="${this.loadingTypes}"
      ></grampsjs-form-person-slot>

      <h3>${this._('Mother')}</h3>

      <grampsjs-form-person-slot
        id="mother-slot"
        .appState="${this.appState}"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        ?loadingTypes="${this.loadingTypes}"
      ></grampsjs-form-person-slot>

      <h3>${this._('Children')}</h3>

      ${this._childKeys.map(
        key => html`
          <div class="child-slot-wrapper">
            <div class="child-slot-header">
              <md-icon-button
                aria-label="${this._('Remove')}"
                @click="${() => this._removeChild(key)}"
              >
                <grampsjs-icon
                  path="${mdiClose}"
                  color="var(--mdc-theme-secondary)"
                ></grampsjs-icon>
              </md-icon-button>
            </div>
            <grampsjs-form-person-slot
              id="child-slot-${key}"
              showRelTypes
              .appState="${this.appState}"
              .types="${this.types}"
              .typesLocale="${this.typesLocale}"
              ?loadingTypes="${this.loadingTypes}"
            ></grampsjs-form-person-slot>
          </div>
        `
      )}

      <md-outlined-button @click="${this._addChild}">
        <grampsjs-icon
          slot="icon"
          path="${mdiPlus}"
          color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
        ></grampsjs-icon>
        ${this._('Add child')}
      </md-outlined-button>

      <h3>${this._('Relationship type:').replace(':', '')}</h3>

      <grampsjs-form-select-type
        noheading
        id="family-rel-type"
        .appState="${this.appState}"
        ?loadingTypes="${this.loadingTypes}"
        typeName="family_relation_types"
        defaultValue="Unknown"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>

      ${this._renderCitationForm()} ${this._renderTagsForm()}

      <div class="spacer"></div>
      <grampsjs-form-private
        id="private"
        .appState="${this.appState}"
      ></grampsjs-form-private>

      ${this.renderButtons()}
    `
  }

  firstUpdated() {
    this.updateComplete.then(() => this.checkFormValidity())
  }

  _addChild() {
    this._childKeys = [...this._childKeys, this._nextChildKey]
    this._nextChildKey += 1
    this.updateComplete.then(() => this.checkFormValidity())
  }

  _removeChild(key) {
    this._childKeys = this._childKeys.filter(k => k !== key)
    this.updateComplete.then(() => this.checkFormValidity())
  }

  _handleFormData(e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'family-rel-type') {
      this.data = {...this.data, type: e.detail.data}
    }
    this.checkFormValidity()
  }

  checkFormValidity() {
    const slots = [
      ...this.shadowRoot.querySelectorAll('grampsjs-form-person-slot'),
    ]
    const fatherHandle = this.shadowRoot
      .querySelector('#father-slot')
      .getData()?.handle
    const motherHandle = this.shadowRoot
      .querySelector('#mother-slot')
      .getData()?.handle
    const childHandles = this._childKeys
      .map(key => this.shadowRoot.querySelector(`#child-slot-${key}`).getData())
      .filter(Boolean)
      .map(child => child.handle)
    this.isFormValid =
      slots.every(slot => slot.checkValidity()) &&
      slots.some(slot => !slot.isEmpty()) &&
      this._slotHandlesAreValid(fatherHandle, motherHandle, childHandles)
  }

  // A person can occupy only one role in a family, and a child can occur once.
  _slotHandlesAreValid(fatherHandle, motherHandle, childHandles) {
    const parents = [fatherHandle, motherHandle].filter(Boolean)
    if (new Set(parents).size !== parents.length) return false
    if (new Set(childHandles).size !== childHandles.length) return false
    return childHandles.every(handle => !parents.includes(handle))
  }

  async _submit() {
    const fatherSlot = this.shadowRoot.querySelector('#father-slot')
    const motherSlot = this.shadowRoot.querySelector('#mother-slot')

    const fatherData = fatherSlot.getData()
    const motherData = motherSlot.getData()

    const fatherHandle = fatherData?.handle ?? null
    const motherHandle = motherData?.handle ?? null

    const childRefList = []
    for (const key of this._childKeys) {
      const slot = this.shadowRoot.querySelector(`#child-slot-${key}`)
      const childData = slot.getData()
      if (childData?.handle) {
        childRefList.push({
          _class: 'ChildRef',
          ref: childData.handle,
          frel: childData.frel,
          mrel: childData.mrel,
        })
      }
    }

    const familyObj = {
      ...this.data,
      _class: 'Family',
      father_handle: fatherHandle,
      mother_handle: motherHandle,
      child_ref_list: childRefList,
    }

    const data = await this.appState.apiPost(this.postUrl, [familyObj])
    if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
      return
    }
    this.error = false
    const created = data.data.find(obj => obj.new._class === 'Family').new
    this._clearDrafts()
    await this._handleCreatedObjects([created])
  }

  _reset() {
    super._reset()
    this.data = dataDefault
    this._childKeys = []
    this._nextChildKey = 0
    this.shadowRoot
      .querySelectorAll('grampsjs-form-person-slot')
      .forEach(slot => slot.reset())
  }
}

window.customElements.define('grampsjs-view-new-family', GrampsjsViewNewFamily)
