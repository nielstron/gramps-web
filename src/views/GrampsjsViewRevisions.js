import {css, html} from 'lit'

import '@material/web/list/list'
import '@material/web/list/list-item'
import '@material/web/select/outlined-select'
import '@material/web/textfield/outlined-text-field'
import {
  mdiSourceCommit,
  mdiAccountPlus,
  mdiAccountMultiplePlus,
  mdiCalendarPlus,
  mdiLabel,
  mdiBookmarkPlus,
  mdiArchivePlus,
  mdiImagePlus,
  mdiMapMarkerPlus,
  mdiTextBoxPlus,
  mdiBookOpenVariant,
  mdiAccountEdit,
  mdiAccountMultiple,
  mdiCalendarEdit,
  mdiBookmark,
  mdiArchiveEdit,
  mdiImageEdit,
  mdiMapMarker,
  mdiTextBoxEdit,
  mdiAccountMinus,
  mdiAccountMultipleMinus,
  mdiCalendarMinus,
  mdiBookmarkMinus,
  mdiArchiveMinus,
  mdiImageMinus,
  mdiMapMarkerMinus,
  mdiTextBoxMinus,
  mdiTimelineQuestionOutline,
} from '@mdi/js'

import '../components/GrampsjsPagination.js'
import '../components/GrampsjsTimedelta.js'
import '../components/GrampsjsIcon.js'

import {GrampsjsView} from './GrampsjsView.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import {appUrl} from '../appUrl.js'
import {transactionHistoryUrl} from '../history.js'
import {debounce} from '../util.js'

const objectClasses = {
  Person: 'People',
  Family: 'Families',
  Event: 'Events',
  Place: 'Places',
  Source: 'Sources',
  Citation: 'Citations',
  Repository: 'Repositories',
  Note: 'Notes',
  Tag: 'Tags',
  Media: 'Media',
}

const changeIcons = {
  Person_0: mdiAccountPlus,
  Family_0: mdiAccountMultiplePlus,
  Event_0: mdiCalendarPlus,
  Place_0: mdiMapMarkerPlus,
  Source_0: mdiBookOpenVariant,
  Citation_0: mdiBookmarkPlus,
  Repository_0: mdiArchivePlus,
  Note_0: mdiTextBoxPlus,
  Tag_0: mdiLabel,
  Media_0: mdiImagePlus,
  Person_1: mdiAccountEdit,
  Family_1: mdiAccountMultiple,
  Event_1: mdiCalendarEdit,
  Place_1: mdiMapMarker,
  Source_1: mdiBookOpenVariant,
  Citation_1: mdiBookmark,
  Repository_1: mdiArchiveEdit,
  Note_1: mdiTextBoxEdit,
  Tag_1: mdiLabel,
  Media_1: mdiImageEdit,
  Person_2: mdiAccountMinus,
  Family_2: mdiAccountMultipleMinus,
  Event_2: mdiCalendarMinus,
  Place_2: mdiMapMarkerMinus,
  Source_2: mdiBookOpenVariant,
  Citation_2: mdiBookmarkMinus,
  Repository_2: mdiArchiveMinus,
  Note_2: mdiTextBoxMinus,
  Tag_2: mdiLabel,
  Media_2: mdiImageMinus,
}

export class GrampsjsViewRevisions extends GrampsjsStaleDataMixin(
  GrampsjsView
) {
  static get styles() {
    return [
      super.styles,
      css`
        md-list-item[type='text'] {
          --md-list-item-label-text-color: var(--grampsjs-body-font-color-48);
        }

        grampsjs-icon[slot='end'] {
          height: 22px;
          width: 22px;
          opacity: 0.9;
        }

        md-divider {
          --md-divider-thickness: 1px;
          --md-divider-color: var(--grampsjs-body-font-color-10);
        }

        .counter {
          position: relative;
          color: var(--grampsjs-color-icon);
          font-size: 11px;
          min-width: 14px;
          height: 14px;
          line-height: 16px;
          left: -17px;
          top: -6px;
          font-weight: 600;
          background-color: var(--grampsjs-color-icon-background);
          border-radius: 100px;
          display: inline-block;
          text-align: center;
          vertical-align: middle;
        }

        :host([embedded]) {
          margin: 0;
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        .filters md-outlined-text-field,
        .filters md-outlined-select {
          width: 100%;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _data: {type: Array},
      _page: {type: Number},
      _pages: {type: Number},
      _pageSize: {type: Number},
      _totalCount: {type: Number},
      _search: {type: String},
      _editor: {type: String},
      _person: {type: String},
      _objectClass: {type: String},
      _transType: {type: String},
      embedded: {type: Boolean, reflect: true},
    }
  }

  constructor() {
    super()
    this._data = []
    this._page = 1
    this._pages = -1
    this._pageSize = 20
    this._totalCount = 0
    this._search = ''
    this._editor = ''
    this._person = ''
    this._objectClass = ''
    this._transType = ''
    this.embedded = false
    this._debouncedApplyFilters = debounce(() => this._applyFilters(), 400)
  }

  render() {
    return html`
      ${this.embedded ? '' : html`<h2>${this._('Revision History')}</h2>`}

      <div class="filters">
        ${this._renderTextFilter('_search', 'Search history', 'search')}
        ${this._renderTextFilter('_editor', 'Editor', 'search')}
        ${this._renderTextFilter('_person', 'Affected person', 'search')}
        <md-outlined-select
          label=${this._('Object type')}
          .value=${this._objectClass}
          @change=${this._handleSelectFilter}
          data-filter="_objectClass"
        >
          <md-select-option value="" ?selected=${this._objectClass === ''}>
            ${this._('All object types')}
          </md-select-option>
          ${Object.entries(objectClasses).map(
            ([value, label]) => html`
              <md-select-option
                value=${value}
                ?selected=${this._objectClass === value}
                >${this._(label)}</md-select-option
              >
            `
          )}
        </md-outlined-select>
        <md-outlined-select
          label=${this._('Action')}
          .value=${this._transType}
          @change=${this._handleSelectFilter}
          data-filter="_transType"
        >
          <md-select-option value="" ?selected=${this._transType === ''}>
            ${this._('All actions')}
          </md-select-option>
          <md-select-option value="0" ?selected=${this._transType === '0'}
            >${this._('Add')}</md-select-option
          >
          <md-select-option value="1" ?selected=${this._transType === '1'}
            >${this._('Update')}</md-select-option
          >
          <md-select-option value="2" ?selected=${this._transType === '2'}
            >${this._('Delete')}</md-select-option
          >
        </md-outlined-select>
      </div>

      ${this._totalCount === 0
        ? html`<p>${this._('None')}.</p>`
        : html`
            <md-list>
              <md-divider></md-divider>
              ${this._data.map(txn => this._renderTransaction(txn))}
            </md-list>
          `}

      <grampsjs-pagination
        page="${this._page}"
        pages="${this._pages}"
        @page:changed="${this._handlePageChanged}"
        .appState="${this.appState}"
      ></grampsjs-pagination>
    `
  }

  _renderTextFilter(property, label, type) {
    return html`
      <md-outlined-text-field
        label=${this._(label)}
        type=${type}
        value=${this[property]}
        data-filter=${property}
        @input=${this._handleTextFilter}
      ></md-outlined-text-field>
    `
  }

  _renderTransaction(txn) {
    // eslint-disable-next-line camelcase
    const counts = txn.changes.reduce((acc, {obj_class, trans_type}) => {
      // eslint-disable-next-line camelcase
      const key = `${obj_class}_${trans_type}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return html`<md-list-item
        ?interactive="${!!txn.changes?.length}"
        type="${txn.changes?.length ? 'link' : 'text'}"
        href="${txn.changes?.length ? appUrl(`/revision/${txn.id}`) : ''}"
      >
        <div slot="headline">${this._(txn.description)}</div>
        <grampsjs-icon
          slot="start"
          path="${mdiSourceCommit}"
          color="var(--grampsjs-body-font-color-50)"
        ></grampsjs-icon>
        ${txn.changes?.length
          ? Object.keys(counts).map(key =>
              changeIcons[key]
                ? html`<grampsjs-icon
                    slot="end"
                    path="${changeIcons[key]}"
                    color="var(--grampsjs-body-font-color-45)"
                  ></grampsjs-icon>`
                : ''
            )
          : html`<grampsjs-icon
              slot="end"
              path="${mdiTimelineQuestionOutline}"
              color="var(--grampsjs-body-font-color-45)"
            ></grampsjs-icon>`}
        <div slot="supporting-text">
          <span class="user">
            ${txn.connection?.user
              ? this._renderUser(txn.connection?.user)
              : this._('Unknown')},
          </span>
          <span class="time">
            <grampsjs-timedelta
              timestamp="${txn.timestamp}"
              locale="${this.appState.i18n.lang}"
            ></grampsjs-timedelta>
          </span>
        </div>
      </md-list-item>
      <md-divider></md-divider> `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderUser(user) {
    return user.full_name || user.name
  }

  async _fetchData() {
    this.loading = true
    const url = transactionHistoryUrl({
      page: this._page,
      pageSize: this._pageSize,
      search: this._search,
      editor: this._editor,
      person: this._person,
      objectClass: this._objectClass,
      transType: this._transType,
    })
    const data = await this.appState.apiGet(url)
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._data = data.data
      this._totalCount = data.total_count
      this._pages = Math.ceil(this._totalCount / this._pageSize)
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  _handlePageChanged(event) {
    this._page = event.detail.page
  }

  _handleTextFilter(event) {
    this[event.target.dataset.filter] = event.target.value
    this._debouncedApplyFilters()
  }

  _handleSelectFilter(event) {
    this[event.target.dataset.filter] = event.target.value
    this._applyFilters()
  }

  _applyFilters() {
    if (this._page === 1) {
      this._fetchData()
    } else {
      this._page = 1
    }
  }

  firstUpdated() {
    this._fetchData()
  }

  handleUpdateStaleData() {
    this._fetchData()
  }

  update(changed) {
    super.update(changed)
    if (changed.has('_page') && changed._page !== this._page) {
      this._fetchData()
    }
  }
}

window.customElements.define('grampsjs-view-revisions', GrampsjsViewRevisions)
