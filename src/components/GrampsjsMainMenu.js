/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import '@material/web/list/list'
import '@material/web/list/list-item'
import '@material/web/divider/divider'

import {
  mdiFamilyTree,
  mdiCreation,
  mdiDna,
  mdiHome,
  mdiImage,
  mdiRss,
  mdiFormatListBulleted,
  mdiMap,
  mdiHistory,
  mdiBookmark,
  mdiFormatListChecks,
  mdiDownload,
  mdiFileExportOutline,
  mdiBell,
  mdiBellBadge,
  mdiTimelineOutline,
} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {appUrl} from '../appUrl.js'
import './GrampsjsIcon.js'
import {NAVIGATION_ITEMS, navigationMode} from '../navigation.js'

const selectedColor = 'var(--grampsjs-color-icon-selected)'
const defaultColor = 'var(--grampsjs-color-icon-default)'

class GrampsjsAppBar extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-list-item {
          --md-list-item-label-text-color: var(--grampsjs-color-drawer-text);
          --md-list-item-label-text-size: 1rem;
          --md-list-item-label-text-weight: 400;
          --md-list-item-one-line-container-height: 40px;
        }

        md-list-item[selected] {
          --md-list-item-label-text-color: var(--grampsjs-color-icon-selected);
          --md-list-item-label-text-weight: 500;
        }

        md-divider {
          --md-divider-thickness: 1px;
          --md-divider-color: rgba(0, 0, 0, 0.12);
          padding: 0 20px;
          margin: 4px 0;
        }

        summary {
          cursor: pointer;
          padding: 12px 20px;
          color: var(--grampsjs-color-drawer-text);
        }

        .unread-badge {
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 9px;
          background: var(--md-sys-color-error, #b00020);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          line-height: 18px;
          text-align: center;
          box-sizing: border-box;
        }
      `,
    ]
  }

  static get properties() {
    return {
      editMode: {type: Boolean},
      editTitle: {type: String},
      editDialogContent: {type: String},
      saveButton: {type: Boolean},
      unreadCount: {type: Number},
    }
  }

  constructor() {
    super()
    this.editMode = false
    this.editTitle = ''
    this.editDialogContent = ''
    this.saveButton = false
    this.unreadCount = 0
    this._boundHandleNotifications = this._handleNotificationsChanged.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    const existing = this.appState?.getNotifications?.() ?? []
    this.unreadCount = existing.filter(n => n?.read === false).length
    window.addEventListener(
      'notifications:changed',
      this._boundHandleNotifications
    )
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener(
      'notifications:changed',
      this._boundHandleNotifications
    )
  }

  _handleNotificationsChanged(e) {
    this.unreadCount = e.detail.unreadCount
  }

  _icon(path, isSelected) {
    return html`<grampsjs-icon
      slot="start"
      path="${path}"
      color="${isSelected ? selectedColor : defaultColor}"
    ></grampsjs-icon>`
  }

  _renderItem(item) {
    const selected = item.pages.includes(this.appState.path.page)
    const icons = {
      home: mdiHome,
      blog: mdiRss,
      tree: mdiFamilyTree,
      timeline: mdiTimelineOutline,
      map: mdiMap,
      dna: mdiDna,
      lists: mdiFormatListBulleted,
      media: mdiImage,
      chat: mdiCreation,
      history: mdiHistory,
      bookmarks: mdiBookmark,
      tasks: mdiFormatListChecks,
      reports: mdiFileExportOutline,
      export: mdiDownload,
      notifications: mdiBell,
    }
    const icon =
      item.id === 'notifications' && this.unreadCount > 0
        ? mdiBellBadge
        : icons[item.id]
    return html`<md-list-item
      type="link"
      href="${appUrl(item.path)}"
      ?selected=${selected}
    >
      ${this._icon(icon, selected)} ${this._(item.label).replace('_', '')}
      ${item.id === 'notifications' && this.unreadCount > 0
        ? html`<span class="unread-badge" slot="end">${this.unreadCount}</span>`
        : ''}
    </md-list-item>`
  }

  render() {
    const items = NAVIGATION_ITEMS.filter(
      item => item.id !== 'chat' || this.canUseChat
    )
    const visible = items.filter(
      item => navigationMode(this.appState, item.id) === 'visible'
    )
    const advanced = items.filter(
      item => navigationMode(this.appState, item.id) === 'advanced'
    )
    const groups = [0, 1, 2]
      .map(group => visible.filter(item => item.group === group))
      .filter(group => group.length)
    return html`<md-list
        >${groups.map(
          (group, index) => html`
            ${index ? html`<md-divider inset></md-divider>` : ''}
            ${group.map(item => this._renderItem(item))}
          `
        )}</md-list
      >
      ${advanced.length
        ? html`<details>
            <summary>${this._('Advanced')}</summary>
            <md-list>${advanced.map(item => this._renderItem(item))}</md-list>
          </details>`
        : ''}`
  }
}

window.customElements.define('grampsjs-main-menu', GrampsjsAppBar)
