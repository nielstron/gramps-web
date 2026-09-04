/*
Form for linking a child to one specific family of the current person.
*/

import {html} from 'lit'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'

import {GrampsjsFormChildRef} from './GrampsjsFormChildRef.js'

export class GrampsjsFormFamilyChildRef extends GrampsjsFormChildRef {
  static get properties() {
    return {
      ...super.properties,
      families: {type: Array},
    }
  }

  constructor() {
    super()
    this.families = []
  }

  renderForm() {
    return html`
      <h4 class="label">${this._('Family')}</h4>
      <p>
        <md-filled-select
          required
          id="family-select"
          label="${this._('Select')}"
          .value="${this.data.familyHandle || ''}"
          @change="${this._handleFamilyChange}"
        >
          <md-select-option value="">
            <div slot="headline"></div>
          </md-select-option>
          ${this.families.map(
            family => html`
              <md-select-option value="${family.handle}">
                <div slot="headline">${family.label}</div>
              </md-select-option>
            `
          )}
        </md-filled-select>
      </p>
      ${super.renderForm()}
    `
  }

  _handleFamilyChange(event) {
    this.data = {...this.data, familyHandle: event.target.value}
  }

  get isValid() {
    return Boolean(this.data.familyHandle) && super.isValid
  }
}

window.customElements.define(
  'grampsjs-form-family-childref',
  GrampsjsFormFamilyChildRef
)
