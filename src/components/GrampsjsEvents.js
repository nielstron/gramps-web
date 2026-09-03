import {html, css} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import {
  fireEvent,
  objectDetail,
  makeHandle,
  eventTypeIconPath,
} from '../util.js'
import {renderIcon} from '../objectRender.js'
import {hasManualEventOrder, sortEventsByDate} from '../util/reorder.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsFormEventRef.js'
import './GrampsjsFormNewEvent.js'
import './GrampsjsObjectForm.js'
import '@material/mwc-button'

export class GrampsjsEvents extends GrampsjsEditableList {
  static get styles() {
    return [
      ...super.styles,
      css`
        md-list-item {
          --md-list-item-top-space: 16px;
          --md-list-item-bottom-space: 16px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      profile: {type: Array},
      eventRef: {type: Array},
      dialogContent: {type: String},
      useSummary: {type: Boolean},
      sorted: {type: Boolean},
      hideAge: {type: Boolean},
      defaultRole: {type: String},
    }
  }

  constructor() {
    super()
    this.profile = []
    this.eventRef = []
    this.objType = 'Event'
    this.useSummary = false
    this.sorted = false
    this.hideAge = false
    this.hasAdd = false
    this.hasShare = true
    this.hasReorder = true
    this.reorderAction = 'reorderEvent'
    this.defaultRole = 'Primary'
  }

  row(obj, i) {
    const j = this.data.indexOf(obj)
    const objProfile = {...obj, profile: this.profile[j]}
    const typeKey = typeof obj.type === 'string' ? obj.type : obj.type?.value
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
        @mouseenter="${() =>
          obj.place
            ? fireEvent(this, 'grampsjs-events:place-hover', {
                handle: obj.place,
              })
            : undefined}"
        @mouseleave="${() =>
          obj.place
            ? fireEvent(this, 'grampsjs-events:place-hover', {handle: null})
            : undefined}"
      >
        ${this._getPrimaryText(objProfile)}
        <span slot="supporting-text"
          >${this._getSecondaryText(objProfile)}</span
        >
        ${renderIcon(
          {object: obj, object_type: 'event'},
          'start',
          eventTypeIconPath[typeKey] || null
        )}
        ${!this.hideAge &&
        objProfile.profile?.age &&
        /\d/.test(objProfile.profile.age)
          ? html`<span slot="trailing-supporting-text"
              >${objProfile.profile.age}</span
            >`
          : ''}
        ${this._renderDragHandle(i)}
      </md-list-item>
    `
  }

  _getPrimaryText(obj) {
    if (this.useSummary) {
      return obj.profile.summary
    }
    return html`
      ${obj.profile.type}
      ${!obj.profile?.role ||
      ['Primary', 'Family', this._('Primary'), this._('Family')].includes(
        obj.profile?.role
      )
        ? ''
        : `(${obj.profile?.role})`}
    `
  }

  _getSecondaryText(obj) {
    const detail = objectDetail('event', obj, this.appState.i18n.strings) || ''
    const context = obj.profile?.context || ''
    const titleLine = [obj.description, context].filter(Boolean).join(' • ')
    return html`
      ${titleLine} ${titleLine && detail.trim() ? html`<br />` : ''} ${detail}
    `
  }

  // row(obj, i, arr) {
  //   const j = this.data.indexOf(obj)
  //   const prof = this.profile[j]
  //   return html`
  //     <tr @click=${() => this._handleClick(obj.gramps_id)}>
  //       <td>${prof.date}</td>
  //       <td>
  //         ${prof.type}
  //         ${!prof?.role ||
  //         ['Primary', 'Family', this._('Primary'), this._('Family')].includes(
  //           prof?.role
  //         )
  //           ? ''
  //           : `(${prof?.role})`}
  //       </td>
  //       <td>${this.useSummary ? prof.summary : obj.description}</td>
  //       <td>${prof.place}</td>
  //       <td>
  //         ${this.edit
  //           ? this._renderActionBtns(obj.handle, i === 0, i === arr.length - 1)
  //           : html`${obj?.media_list?.length > 0
  //               ? html` <mwc-icon class="inline">photo</mwc-icon>`
  //               : ''}
  //             ${obj?.note_list?.length > 0 > 0
  //               ? html` <mwc-icon class="inline">sticky_note_2</mwc-icon>`
  //               : ''}`}
  //       </td>
  //     </tr>
  //   `
  // }

  sortData(dataCopy) {
    if (!this.sorted && hasManualEventOrder(this.eventRef)) {
      return dataCopy
    }
    return sortEventsByDate(dataCopy)
  }

  _getReorderDetail(reordered, oldIndex, newIndex) {
    const order = reordered.map(event => this.data.indexOf(event))
    const chronologicalOrder = sortEventsByDate([...this.data]).map(event =>
      this.data.indexOf(event)
    )
    return {
      ...super._getReorderDetail(reordered, oldIndex, newIndex),
      order,
      manual: order.some((sourceIndex, index) => {
        return sourceIndex !== chronologicalOrder[index]
      }),
    }
  }

  _sourceIndex(displayIndex) {
    return this.data.indexOf(this._getDisplayData()[displayIndex])
  }

  _handleShare() {
    this.dialogContent = html`
      <grampsjs-form-eventref
        new
        id="share-event-ref"
        defaultRole="${this.defaultRole}"
        @object:save="${this._handleEventRefSave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
        dialogTitle=${this._('Add or link event')}
      >
      </grampsjs-form-eventref>
    `
  }

  _handleEdit() {
    const sourceIndex = this._sourceIndex(this._selectedIndex)
    const data = this.eventRef[sourceIndex]
    this.dialogContent = html`
      <grampsjs-form-eventref
        id="edit-event-ref"
        @object:save="${e => this._handleEventRefSaveEdit(e, sourceIndex)}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
        .data="${data}"
        dialogTitle=${this._('Event Reference Editor')}
      >
      </grampsjs-form-eventref>
    `
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-new-event
        defaultRole="${this.defaultRole}"
        @object:save="${this._handleNewEventSave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        dialogTitle="${this._('Add a new event')}"
      >
      </grampsjs-form-new-event>
    `
  }

  _handleNewEventSave(e) {
    const handle = makeHandle()
    fireEvent(this, 'edit:action', {
      action: 'newEvent',
      data: {handle, ...e.detail.data},
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleEventRefSave(e) {
    fireEvent(this, 'edit:action', {action: 'addEventRef', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleEventRefSaveEdit(e, sourceIndex) {
    fireEvent(this, 'edit:action', {
      action: 'updateEventRef',
      data: e.detail.data,
      index: sourceIndex,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleDialogCancel() {
    this.dialogContent = ''
  }

  _handleDelete() {
    fireEvent(this, 'edit:action', {
      action: 'delEvent',
      index: this._sourceIndex(this._selectedIndex),
    })
  }

  _handleUp() {
    this._handleReorder(this._selectedIndex, this._selectedIndex - 1)
  }

  _handleDown() {
    this._handleReorder(this._selectedIndex, this._selectedIndex + 1)
  }

  _handleClick(grampsId) {
    if (!this.edit) {
      fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `event/${grampsId}`
  }
}

window.customElements.define('grampsjs-events', GrampsjsEvents)
