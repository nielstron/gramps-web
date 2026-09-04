import {html, css, LitElement} from 'lit'
import '@material/web/dialog/dialog.js'
import '@material/web/iconbutton/icon-button.js'
import {mdiLinkPlus} from '@mdi/js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {familyTitleFromProfile, fireEvent} from '../util.js'
import {
  linkParent,
  linkParentToFamily,
  linkChild,
  linkChildToFamily,
  linkSibling,
  linkSpouse,
} from '../util/familyLinks.js'
import './GrampsjsFormPersonRef.js'
import './GrampsjsFormSpouseRef.js'
import './GrampsjsFormChildRef.js'
import './GrampsjsFormFamilyChildRef.js'
import './GrampsjsIcon.js'

export class GrampsjsTreeChartAddPerson extends GrampsjsAppStateMixin(
  LitElement
) {
  static get styles() {
    return css`
      .relation-row {
        display: flex;
        align-items: center;
        padding: 4px 0;
      }
      .relation-row span {
        flex: 1;
      }
    `
  }

  static get properties() {
    return {
      _pickerOpen: {type: Boolean},
      _formOpen: {type: Boolean},
      _personData: {type: Object},
      _relationship: {type: String},
    }
  }

  constructor() {
    super()
    this._pickerOpen = false
    this._formOpen = false
    this._personData = null
    this._relationship = ''
  }

  open(personData) {
    this._personData = personData
    this._pickerOpen = true
  }

  _selectRelationship(relationship) {
    this._relationship = relationship
    this._pickerOpen = false
    this._formOpen = true
  }

  async _dispatch(handle, frel, mrel, relType, familyHandle) {
    const personData = this._personData
    let result
    if (this._relationship === 'father' || this._relationship === 'mother') {
      result = familyHandle
        ? await linkParentToFamily(
            this.appState,
            personData,
            familyHandle,
            handle,
            this._relationship,
            frel,
            mrel
          )
        : await linkParent(
            this.appState,
            personData,
            handle,
            this._relationship,
            frel,
            mrel
          )
    } else if (this._relationship === 'child') {
      result = familyHandle
        ? await linkChildToFamily(
            this.appState,
            personData,
            familyHandle,
            handle,
            frel,
            mrel
          )
        : await linkChild(this.appState, personData, handle, frel, mrel)
    } else if (this._relationship === 'spouse') {
      result = await linkSpouse(this.appState, personData, handle, relType)
    } else if (this._relationship === 'sibling') {
      result = familyHandle
        ? await linkChildToFamily(
            this.appState,
            personData,
            familyHandle,
            handle,
            frel,
            mrel,
            'child'
          )
        : await linkSibling(this.appState, personData, handle, frel, mrel)
    }
    if (result && 'error' in result) {
      fireEvent(this, 'grampsjs:error', {message: result.error})
      return false
    }
    return true
  }

  async _handleExistingPersonSave(e) {
    const handle = e.detail.data?.ref
    this._formOpen = false
    if (!handle) {
      this._reset()
      return
    }
    const ok = await this._dispatch(
      handle,
      e.detail.data?.frel,
      e.detail.data?.mrel,
      e.detail.data?.type,
      e.detail.data?.familyHandle
    )
    if (ok) {
      this._reset()
    } else {
      this._pickerOpen = true
      this._relationship = ''
    }
  }

  _reset() {
    this._personData = null
    this._relationship = ''
  }

  _cancelForm() {
    this._formOpen = false
    this._pickerOpen = true
    this._relationship = ''
  }

  _renderRelationRow(label, relationship) {
    return html`
      <div class="relation-row">
        <span>${label}</span>
        <md-icon-button
          aria-label="${this._('Add or link person')}"
          @click="${() => this._selectRelationship(relationship)}"
        >
          <grampsjs-icon
            path="${mdiLinkPlus}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
      </div>
    `
  }

  _renderPickerDialog() {
    const primaryFamily = this._personData?.extended?.primary_parent_family
    const parentFamilies = [
      ...(this._personData?.extended?.parent_families ?? []),
      ...(primaryFamily?.handle ? [primaryFamily] : []),
    ]
    const canAddFather =
      parentFamilies.length === 0 ||
      parentFamilies.some(family => !family.father_handle)
    const canAddMother =
      parentFamilies.length === 0 ||
      parentFamilies.some(family => !family.mother_handle)

    return html`
      <md-dialog
        ?open="${this._pickerOpen}"
        @closed="${() => {
          this._pickerOpen = false
          if (!this._formOpen) {
            this._reset()
          }
        }}"
      >
        <div slot="headline">${this._('Add Family Member')}</div>
        <div slot="content">
          ${canAddFather
            ? this._renderRelationRow(this._('Father'), 'father')
            : ''}
          ${canAddMother
            ? this._renderRelationRow(this._('Mother'), 'mother')
            : ''}
          ${this._renderRelationRow(this._('Child'), 'child')}
          ${this._renderRelationRow(this._('Sibling'), 'sibling')}
          ${this._renderRelationRow(this._('Spouse'), 'spouse')}
        </div>
      </md-dialog>
    `
  }

  _renderFormDialog() {
    if (!this._formOpen) {
      return ''
    }

    const familyRelationship = [
      'father',
      'mother',
      'child',
      'sibling',
    ].includes(this._relationship)
    const families = this._familyChoices(this._relationship)
    if (familyRelationship && families.length > 0) {
      return html`
        <grampsjs-form-family-childref
          @object:save="${this._handleExistingPersonSave}"
          @object:cancel="${this._cancelForm}"
          .appState="${this.appState}"
          .families="${families}"
          dialogTitle="${this._('Add or link person')}"
        ></grampsjs-form-family-childref>
      `
    }

    if (['child', 'sibling'].includes(this._relationship)) {
      return html`
        <grampsjs-form-family-childref
          @object:save="${this._handleExistingPersonSave}"
          @object:cancel="${this._cancelForm}"
          .appState="${this.appState}"
          .families="${[]}"
          dialogTitle="${this._('Add or link person')}"
        ></grampsjs-form-family-childref>
      `
    }

    if (['father', 'mother'].includes(this._relationship)) {
      return html`
        <grampsjs-form-childref
          @object:save="${this._handleExistingPersonSave}"
          @object:cancel="${this._cancelForm}"
          .appState="${this.appState}"
          dialogTitle="${this._('Add or link person')}"
        ></grampsjs-form-childref>
      `
    }

    const isSpouse = this._relationship === 'spouse'

    return isSpouse
      ? html`
          <grampsjs-form-spouseref
            @object:save="${this._handleExistingPersonSave}"
            @object:cancel="${this._cancelForm}"
            .appState="${this.appState}"
            dialogTitle="${this._('Add or link person')}"
          ></grampsjs-form-spouseref>
        `
      : html`
          <grampsjs-form-personref
            @object:save="${this._handleExistingPersonSave}"
            @object:cancel="${this._cancelForm}"
            .appState="${this.appState}"
            dialogTitle="${this._('Add or link person')}"
          ></grampsjs-form-personref>
        `
  }

  _familyChoices(relationship) {
    const isChild = relationship === 'child'
    const isParent = ['father', 'mother'].includes(relationship)
    const primaryParentFamily =
      this._personData?.extended?.primary_parent_family
    const rawFamilies = isChild
      ? this._personData?.extended?.families ?? []
      : [
          ...(this._personData?.extended?.parent_families ?? []),
          ...(primaryParentFamily?.handle ? [primaryParentFamily] : []),
        ]
    const eligibleFamilies = isParent
      ? rawFamilies.filter(family => !family[`${relationship}_handle`])
      : rawFamilies
    const uniqueRawFamilies = [
      ...new Map(
        eligibleFamilies.map(family => [family.handle, family])
      ).values(),
    ]
    const familyProfiles = isChild
      ? this._personData?.profile?.families ?? []
      : [
          this._personData?.profile?.primary_parent_family,
          ...(this._personData?.profile?.other_parent_families ?? []),
        ].filter(Boolean)
    return uniqueRawFamilies.map((family, index) => {
      const profile =
        familyProfiles.find(item => item.handle === family.handle) ??
        familyProfiles[index] ??
        {}
      return {
        ...family,
        label:
          familyTitleFromProfile(profile) ||
          profile.gramps_id ||
          family.gramps_id ||
          family.handle,
      }
    })
  }

  render() {
    return html`${this._renderPickerDialog()} ${this._renderFormDialog()}`
  }
}

window.customElements.define(
  'grampsjs-tree-chart-add-person',
  GrampsjsTreeChartAddPerson
)
