/*
Element for selecting a Gramps type
*/

import {css, html, LitElement} from 'lit'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
import '@material/web/textfield/filled-text-field.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {groupEventTypes} from '../util/eventTypeGroups.js'

class GrampsjsFormSelectType extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .hide {
          display: none;
        }
        md-select-option.type-group {
          --md-list-item-bottom-space: 4px;
          --md-list-item-disabled-opacity: 1;
          --md-list-item-label-text-color: var(--md-sys-color-primary);
          --md-list-item-label-text-size: 0.8rem;
          --md-list-item-label-text-weight: 600;
          --md-list-item-one-line-container-height: 36px;
          --md-list-item-top-space: 8px;
          border-top: 1px solid var(--md-sys-color-outline-variant);
        }
      `,
    ]
  }

  static get properties() {
    return {
      disabled: {type: Boolean},
      loadingTypes: {type: Boolean},
      nocustom: {type: Boolean},
      noheading: {type: Boolean},
      required: {type: Boolean},
      allowedTypes: {type: Array},
      defaultValue: {type: String},
      heading: {type: String},
      label: {type: String},
      typeName: {type: String},
      typeNameCustom: {type: String},
      types: {type: Object},
      typesLocale: {type: Object},
      value: {type: String},
      _hasCustomType: {type: Boolean},
      _touched: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.disabled = false
    this.loadingTypes = false
    this.nocustom = false
    this.noheading = false
    this.required = false
    this.allowedTypes = []
    this.defaultValue = 'General'
    this.heading = ''
    this.label = ''
    this.typeName = ''
    this.typeNameCustom = ''
    this.types = {}
    this.typesLocale = {}
    this.value = ''
    this._hasCustomType = false
    this._touched = false
  }

  reset() {
    this._hasCustomType = false
    this._touched = false
    this.value = ''
    const selectElement = this.renderRoot.querySelector('#select-type')
    if (selectElement) {
      selectElement.select(this.defaultValue)
    }
  }

  updated(changed) {
    if (changed.has('types')) {
      const types = this.getTypes()
      if (
        Array.isArray(types) &&
        !types.includes(this.value) &&
        types.includes(this.defaultValue)
      ) {
        this.#setValue(this.defaultValue)
      }
    }
  }

  isValid() {
    return !this.required || this.value
  }

  render() {
    return html`
      ${this.noheading ? '' : this.#renderHeading()}
      <p>
        ${this.loadingTypes ? this.#renderLoading() : this.#renderInputs()}
        ${this.nocustom ? '' : this.#renderCustomSwitch()}
      </p>
    `
  }

  #renderHeading() {
    return html`<h4 class="label">${this.heading || this._('Type')}</h4>`
  }

  #renderLoading() {
    return html`
      <md-filled-select
        style="width:100%"
        label="${this._('Loading items...')}"
        disabled
      ></md-filled-select>
    `
  }

  #renderInputs() {
    return html`
      ${!this._hasCustomType
        ? html`
            <md-filled-select
              style="width:100%"
              ?disabled="${this.disabled}"
              ?error="${this.#error}"
              error-text="${this._('This field is mandatory')}"
              @change="${this.#handleSelectChange}"
              @closing="${this.#handleSelectClosing}"
              label="${this.label}"
              .value="${this.value}"
              id="select-type"
            >
              <md-select-option value="">
                <div slot="headline"></div>
              </md-select-option>
              ${this.#renderTypeOptions()}
            </md-filled-select>
          `
        : html`
            <md-filled-text-field
              style="width:100%"
              ?disabled="${this.disabled}"
              ?error="${this.#error}"
              error-text="${this._('This field is mandatory')}"
              @input="${this.#handleTextFieldInput}"
              @blur="${this.#handleTextFieldBlur}"
              label="${this.label} ${this._('Custom')}"
              .value="${this.value}"
              id="custom-type"
            >
            </md-filled-text-field>
          `}
    `
  }

  #renderTypeOptions() {
    if (this.typeName !== 'event_types') {
      return this.getTypes().map(type => this.#renderTypeOption(type))
    }

    return this.#getEventTypeGroups().map(
      group => html`
        <md-select-option
          class="type-group"
          value="__event_type_group_${group.label}"
          disabled
        >
          <div slot="headline">${this._(group.label)}</div>
        </md-select-option>
        ${group.types.map(type => this.#renderTypeOption(type))}
      `
    )
  }

  #renderTypeOption(type) {
    return html`
      <md-select-option value="${type}">
        <div slot="headline">${this._(type)}</div>
      </md-select-option>
    `
  }

  #getEventTypeGroups() {
    const {defaultTypes, customTypes} = this.#getTypesByOrigin()
    return groupEventTypes(
      defaultTypes,
      customTypes,
      type => this._(type),
      this.appState.i18n.lang || 'en'
    )
  }

  #renderCustomSwitch() {
    return html`
      <md-text-button
        style="margin-top: 4px;"
        id="button-switch-type"
        @click="${this.#toggleCustomType}"
        ?disabled="${this.disabled || this.loadingTypes}"
      >
        ${this._hasCustomType
          ? this._('Switch to default type')
          : this._('Add custom type')}
      </md-text-button>
    `
  }

  getTypes(nonLocal = true) {
    const {defaultTypes, customTypes} = this.#getTypesByOrigin(nonLocal)
    return defaultTypes.concat(customTypes)
  }

  #getTypesByOrigin(nonLocal = true) {
    const types = nonLocal ? this.types : this.typesLocale
    const defaultTypesAll = types?.default || {}
    const customTypesAll = types?.custom || {}
    const defaultTypes =
      this.typeName in defaultTypesAll ? defaultTypesAll[this.typeName] : []
    const customTypes =
      this.typeNameCustom || this.typeName in customTypesAll
        ? customTypesAll[this.typeNameCustom || this.typeName]
        : []
    if (this.allowedTypes.length > 0) {
      return {
        defaultTypes: defaultTypes.filter(type =>
          this.allowedTypes.includes(type)
        ),
        customTypes: customTypes.filter(type =>
          this.allowedTypes.includes(type)
        ),
      }
    }
    return {defaultTypes, customTypes}
  }

  #toggleCustomType() {
    this._hasCustomType = !this._hasCustomType
    if (this._hasCustomType) {
      this._touched = false
    }
    this.#setValue('')
  }

  #handleSelectChange(e) {
    this.#setValue(e.target.value)
  }

  #handleSelectClosing() {
    this._touched = true
  }

  #handleTextFieldInput(e) {
    this.#setValue(e.target.value)
  }

  #handleTextFieldBlur() {
    this._touched = true
  }

  #setValue(value) {
    this.value = value
    this.dispatchEvent(
      new CustomEvent('formdata:changed', {
        bubbles: true,
        composed: true,
        detail: {data: value},
      })
    )
  }

  get #error() {
    return this._touched && !this.isValid()
  }
}

window.customElements.define(
  'grampsjs-form-select-type',
  GrampsjsFormSelectType
)
