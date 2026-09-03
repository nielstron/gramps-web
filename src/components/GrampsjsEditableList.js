/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
import {css, html, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {keyed} from 'lit/directives/keyed.js'
import Sortable from 'sortablejs'

import {fireEvent} from '../util.js'
import {moveToIndex} from '../util/reorder.js'
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiDelete,
  mdiDragVertical,
  mdiLinkPlus,
  mdiPencil,
  mdiPlus,
} from '@mdi/js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'

import {personListItemStyles, sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsEditableList extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      personListItemStyles,
      css`
        md-list.activatable,
        md-list.activatable > * {
          --md-ripple-hover-opacity: 0;
          --md-ripple-pressed-opacity: 0;
        }

        md-list.activatable > * {
          transition: background-color 0.1s, color 0.1s;
        }

        md-list.activatable md-list-item.selected {
          background-color: var(
            --grampsjs-editable-list-selected-background-color,
            color-mix(in srgb, var(--md-sys-color-primary) 12%, transparent)
          );
        }

        md-list.activatable md-list-item:not(.selected):hover,
        md-list.activatable md-list-item:not(.selected):focus {
          background-color: var(
            --grampsjs-editable-list-hover-background-color,
            color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent)
          );
        }

        md-list.activatable md-list-item:not(.selected):active {
          background-color: var(
            --grampsjs-editable-list-active-background-color,
            color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent)
          );
        }

        md-list.activatable md-list-item.selected:hover,
        md-list.activatable md-list-item.selected:focus {
          background-color: var(
            --grampsjs-editable-list-selected-hover-background-color,
            color-mix(in srgb, var(--md-sys-color-primary) 16%, transparent)
          );
          color: var(--grampsjs-body-font-color-90);
        }

        md-list.activatable md-list-item.selected:active {
          background-color: var(
            --grampsjs-editable-list-selected-active-background-color,
            color-mix(in srgb, var(--md-sys-color-primary) 20%, transparent)
          );
        }

        md-icon-button[disabled] {
          color: var(--grampsjs-body-font-color-25);
        }

        .drag-handle {
          cursor: grab;
          touch-action: none;
          color: var(--grampsjs-body-font-color-50);
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        md-list-item.drag-ghost {
          opacity: 0.35;
        }

        md-list-item.drag-chosen {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-primary) 12%,
            var(--md-sys-color-surface)
          );
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      edit: {type: Boolean},
      objType: {type: String},
      dialogContent: {type: String},
      dialogTitle: {type: String},
      hasAdd: {type: Boolean},
      hasShare: {type: Boolean},
      hasEdit: {type: Boolean},
      hasReorder: {type: Boolean},
      reorderAction: {type: String},
      _selectedIndex: {type: Number},
      _listRenderKey: {type: Number},
    }
  }

  constructor() {
    super()
    this.data = []
    this.edit = false
    this.objType = ''
    this.dialogContent = ''
    this.dialogTitle = ''
    this.hasAdd = true
    this.hasShare = false
    this.hasEdit = false
    this.hasReorder = false
    this.reorderAction = ''
    this._selectedIndex = -1
    this._listRenderKey = 0
    this._dragData = null
    this._sortable = null
  }

  render() {
    const showCreateActions =
      this.appState?.permissions?.canAdd && (this.hasAdd || this.hasShare)
    return html`
      ${Object.keys(this.data).length === 0 && !this.edit && !showCreateActions
        ? ''
        : html`
            ${this.edit || showCreateActions
              ? this._renderActionBtns(showCreateActions)
              : ''}
            ${keyed(
              this._listRenderKey,
              html`<md-list class="${classMap({activatable: this.edit})}">
                ${this._getDisplayData().map((obj, i, arr) =>
                  this.row(obj, i, arr)
                )}
              </md-list>`
            )}
          `}
      ${this.dialogContent}
    `
  }

  _handleSelected(i) {
    this._selectedIndex = i
  }

  // function to sort the data, if necessary
  sortData(dataCopy) {
    return dataCopy
  }

  _getDisplayData() {
    return this._dragData || this.sortData([...this.data])
  }

  row(obj, i, arr) {
    return ''
  }

  _canDragReorder() {
    return (
      this.edit &&
      this.hasReorder &&
      Boolean(this.reorderAction) &&
      this.data.length > 1
    )
  }

  _renderDragHandle(index) {
    if (!this._canDragReorder()) {
      return ''
    }
    return html`
      <md-icon-button
        slot="end"
        class="drag-handle"
        aria-label="${this._('Drag to reorder')}"
        title="${this._('Drag to reorder')}"
        @click="${e => e.stopPropagation()}"
        @keydown="${e => this._handleDragKeydown(e, index)}"
      >
        <grampsjs-icon path="${mdiDragVertical}"></grampsjs-icon>
      </md-icon-button>
    `
  }

  _handleDragKeydown(event, index) {
    const direction =
      event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
    if (!direction) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    this._handleReorder(index, index + direction)
  }

  _handleReorder(oldIndex, newIndex) {
    const displayData = this._getDisplayData()
    const reordered = moveToIndex(displayData, oldIndex, newIndex)
    if (reordered === displayData) {
      return
    }
    this._dragData = reordered
    this._listRenderKey += 1
    this._selectedIndex = -1
    fireEvent(
      this,
      'edit:action',
      this._getReorderDetail(reordered, oldIndex, newIndex)
    )
  }

  _getReorderDetail(reordered, oldIndex, newIndex) {
    return {action: this.reorderAction, oldIndex, newIndex}
  }

  _renderActionBtns(showCreateActions = false) {
    return html`
      ${showCreateActions && this.hasShare
        ? html`
            <md-icon-button class="edit" @click="${this._handleShare}">
              <grampsjs-icon
                path="${mdiLinkPlus}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
          `
        : ''}
      ${showCreateActions && this.hasAdd
        ? html`
            <md-icon-button class="edit" @click="${this._handleAdd}">
              <grampsjs-icon
                path="${mdiPlus}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
          `
        : ''}
      ${this.edit && this.hasEdit
        ? html`
            <md-icon-button
              ?disabled="${this._selectedIndex === -1}"
              class="edit"
              @click="${this._handleEdit}"
            >
              <grampsjs-icon
                path="${mdiPencil}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
          `
        : ''}
      ${this.edit && this.hasReorder
        ? html`
            <md-icon-button
              ?disabled="${this._selectedIndex === -1 ||
              this._selectedIndex === 0}"
              class="edit"
              @click="${this._handleUp}"
            >
              <grampsjs-icon
                path="${mdiArrowUp}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
            <md-icon-button
              ?disabled="${this._selectedIndex === -1 ||
              this._selectedIndex === this.data.length - 1}"
              class="edit"
              @click="${this._handleDown}"
            >
              <grampsjs-icon
                path="${mdiArrowDown}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
          `
        : ''}
      ${this.edit
        ? html`
            <md-icon-button
              ?disabled="${this._selectedIndex === -1}"
              class="edit"
              @click="${this._handleDelete}"
            >
              <grampsjs-icon
                path="${mdiDelete}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
          `
        : ''}
    `
  }

  willUpdate(changed) {
    if (changed.has('data')) {
      this._dragData = null
    }
    super.willUpdate(changed)
  }

  updated(changed) {
    if (changed.has('edit')) {
      this._selectedIndex = -1
      this.dialogContent = ''
    }
    this._syncSortable()
  }

  _syncSortable() {
    const list = this.renderRoot.querySelector('md-list')
    if (!this._canDragReorder() || !list) {
      this._destroySortable()
      return
    }
    if (this._sortable?.el === list) {
      return
    }
    this._destroySortable()
    this._sortable = Sortable.create(list, {
      animation: 150,
      chosenClass: 'drag-chosen',
      draggable: 'md-list-item',
      ghostClass: 'drag-ghost',
      handle: '.drag-handle',
      onEnd: event => this._handleReorder(event.oldIndex, event.newIndex),
    })
  }

  _destroySortable() {
    this._sortable?.destroy()
    this._sortable = null
  }

  disconnectedCallback() {
    this._destroySortable()
    super.disconnectedCallback()
  }

  _updateSelectionAfterReorder(movedUp) {
    // Clear selection to avoid highlighting wrong item while API call completes.
    // The movedUp parameter is provided for subclasses that may want to track
    // and restore selection after the data updates.
    this._selectedIndex = -1
  }

  _handleActionClick(e, action, handle) {
    fireEvent(this, 'edit:action', {action, handle})
    e.preventDefault()
    e.stopPropagation()
  }
}
