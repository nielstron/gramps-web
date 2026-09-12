import {css, html} from 'lit'

import '@material/web/tabs/tabs'
import '@material/web/tabs/primary-tab'
import '@material/web/button/filled-button'
import '@material/web/button/outlined-button'

import {
  mdiFamilyTree,
  mdiTransitConnectionVariant,
  mdiPlus,
  mdiPencil,
} from '@mdi/js'
import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsFormSelectObject.js'
import './GrampsjsViewDescendantChart.js'
import './GrampsjsViewTreeChart.js'
import './GrampsjsViewHourglassChart.js'
import './GrampsjsViewFanChart.js'
import './GrampsjsViewRelationshipChart.js'
import './GrampsjsViewConnectionGraph.js'
import {fireEvent} from '../util.js'
import {
  chartFanIconPath,
  hourglassIconPath,
  renderIconSvg,
  relationshipGraphIconPath,
} from '../icons.js'
import {
  DEFAULT_TREE_VIEW,
  getTreePath,
  getTreeViewForTab,
  getTreeViewTabIndex,
  normalizeTreeView,
} from '../treeDefaults.js'
import {appUrl} from '../appUrl.js'

export class GrampsjsViewTree extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .with-margin {
          margin: 25px 40px;
        }

        md-primary-tab {
          opacity: 0.8;
        }

        md-primary-tab[active] {
          opacity: 1;
        }

        #tabs {
          height: 85px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      targetGrampsId: {type: String},
      view: {type: String},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.targetGrampsId = ''
    this.view = DEFAULT_TREE_VIEW
    this._boundSelectPerson = this._selectPerson.bind(this)
  }

  shouldUpdate(changed) {
    // Allow one render when active changes so child chart views receive
    // the updated active value — the base class blocks renders when inactive.
    if (changed.has('active')) {
      return true
    }
    return super.shouldUpdate(changed)
  }

  updated(changed) {
    super.updated(changed)
    if (this.active) {
      this._canonicalizeUrl()
    }
  }

  renderContent() {
    if (this.grampsId === '') {
      return this._renderNoHomePerson()
    }
    return html`
      <div id="tabs">${this.renderTabs()}</div>
      ${this._currentTabId === 0 ? this._renderPedigree() : ''}
      ${this._currentTabId === 1 ? this._renderDescendantTree() : ''}
      ${this._currentTabId === 2 ? this._renderHourglassTree() : ''}
      ${this._currentTabId === 3 ? this._renderRelationshipChart() : ''}
      ${this._currentTabId === 4 ? this._renderFan() : ''}
      ${this._currentTabId === 5 ? this._renderConnectionGraph() : ''}
    `
  }

  get _currentTabId() {
    return getTreeViewTabIndex(this.view)
  }

  _handleTabChange(e) {
    const view = getTreeViewForTab(e.target.activeTabIndex)
    fireEvent(this, 'edit-mode:off', {})
    fireEvent(this, 'nav', {
      path: getTreePath(view, this.grampsId, this.targetGrampsId),
    })
  }

  renderTabs() {
    return html`
      <md-tabs
        .activeTabIndex=${this._currentTabId}
        @change=${this._handleTabChange}
      >
        <md-primary-tab has-icon
          >${this._('Ancestor Tree')}
          <span slot="icon"
            >${renderIconSvg(
              mdiFamilyTree,
              '--md-sys-color-primary',
              -90
            )}</span
          >
        </md-primary-tab>
        <md-primary-tab has-icon>
          ${this._('Descendant Tree')}
          <span slot="icon"
            >${renderIconSvg(mdiFamilyTree, '--md-sys-color-primary', 90)}</span
          >
        </md-primary-tab>
        <md-primary-tab has-icon>
          ${this._('Hourglass Graph')}
          <span slot="icon"
            >${renderIconSvg(hourglassIconPath, '--md-sys-color-primary')}</span
          >
        </md-primary-tab>
        <md-primary-tab has-icon>
          ${this._('Relationship Graph')}
          <span slot="icon"
            >${renderIconSvg(
              relationshipGraphIconPath,
              '--md-sys-color-primary'
            )}</span
          >
        </md-primary-tab>
        <md-primary-tab has-icon>
          ${this._('Fan Chart')}
          <span slot="icon"
            >${renderIconSvg(chartFanIconPath, '--md-sys-color-primary')}</span
          >
        </md-primary-tab>
        <md-primary-tab has-icon>
          ${this._('Connection Graph')}
          <span slot="icon"
            >${renderIconSvg(
              mdiTransitConnectionVariant,
              '--md-sys-color-primary'
            )}</span
          >
        </md-primary-tab>
      </md-tabs>
    `
  }

  _renderConnectionGraph() {
    return html`
      <grampsjs-view-connection-graph
        grampsId=${this.grampsId}
        targetGrampsId=${this.targetGrampsId}
        ?active=${this.active}
        .appState=${this.appState}
        .settings=${this.settings}
      ></grampsjs-view-connection-graph>
    `
  }

  _renderFan() {
    return html`
      <grampsjs-view-fan-chart
        @tree:person="${this._goToPerson}"
        @tree:home="${this._backToHomePerson}"
        grampsId=${this.grampsId}
        ?active=${this.active}
        .appState="${this.appState}"
        .settings=${this.settings}
        ?disableHome=${this.grampsId === this.settings.homePerson}
      >
      </grampsjs-view-fan-chart>
    `
  }

  _renderRelationshipChart() {
    return html`
      <grampsjs-view-relationship-chart
        @tree:person="${this._goToPerson}"
        @tree:home="${this._backToHomePerson}"
        grampsId=${this.grampsId}
        ?active=${this.active}
        .appState="${this.appState}"
        .settings=${this.settings}
        ?disableHome=${this.grampsId === this.settings.homePerson}
      >
      </grampsjs-view-relationship-chart>
    `
  }

  _renderPedigree() {
    return html`
      <grampsjs-view-tree-chart
        @tree:person="${this._goToPerson}"
        @tree:home="${this._backToHomePerson}"
        grampsId=${this.grampsId}
        ?active=${this.active}
        .appState="${this.appState}"
        .settings=${this.settings}
        ?disableHome=${this.grampsId === this.settings.homePerson}
      >
      </grampsjs-view-tree-chart>
    `
  }

  _renderDescendantTree() {
    return html`
      <grampsjs-view-descendant-chart
        @tree:person="${this._goToPerson}"
        @tree:home="${this._backToHomePerson}"
        grampsId=${this.grampsId}
        ?active=${this.active}
        .appState="${this.appState}"
        .settings=${this.settings}
        ?disableHome=${this.grampsId === this.settings.homePerson}
      >
      </grampsjs-view-descendant-chart>
    `
  }

  _renderHourglassTree() {
    return html`
      <grampsjs-view-hourglass-chart
        @tree:person="${this._goToPerson}"
        @tree:home="${this._backToHomePerson}"
        grampsId=${this.grampsId}
        ?active=${this.active}
        .appState="${this.appState}"
        .settings=${this.settings}
        ?disableHome=${this.grampsId === this.settings.homePerson}
      >
      </grampsjs-view-hourglass-chart>
    `
  }

  _backToHomePerson() {
    fireEvent(this, 'nav', {
      path: getTreePath(
        this.view,
        this.settings.homePerson,
        this.targetGrampsId
      ),
    })
  }

  _goToPerson() {
    fireEvent(this, 'nav', {path: `person/${this.grampsId}`})
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('pedigree:person-selected', this._boundSelectPerson)
  }

  disconnectedCallback() {
    window.removeEventListener(
      'pedigree:person-selected',
      this._boundSelectPerson
    )
    super.disconnectedCallback()
  }

  update(changed) {
    super.update(changed)
  }

  _canonicalizeUrl() {
    if (!this.grampsId || this.appState?.path?.page !== 'tree') {
      return
    }
    const view = normalizeTreeView(this.view)
    if (
      this.appState.path.pageId !== view ||
      this.appState.path.pageId2 !== this.grampsId ||
      this.appState.path.pageId3 !== this.targetGrampsId
    ) {
      fireEvent(this, 'nav', {
        path: getTreePath(view, this.grampsId, this.targetGrampsId),
        replaceHistory: true,
      })
    }
  }

  _selectPerson(event) {
    const {grampsId} = event.detail
    if (!this.active || !grampsId) {
      return
    }
    fireEvent(this, 'nav', {
      path: getTreePath(this.view, grampsId, this.targetGrampsId),
    })
  }

  // Shown whenever no home person is set. An empty tree has nobody to pick, so
  // it offers person creation. The first person becomes the home person, which
  // brings the user straight back here with a chart to look at.
  _renderNoHomePerson() {
    // A missing object_counts counts as empty: person creation leads somewhere
    // either way, while the picker has nothing to offer an empty tree.
    const hasPeople = this.appState.dbInfo?.object_counts?.people
    // The Home link is the escape hatch for users whose permissions leave them
    // no action below.
    return html`
      <div class="with-margin">
        <p>
          ${this._('No Home Person set.')}
          <a href="${appUrl('/')}">${this._('Home')}</a>
        </p>
        ${hasPeople
          ? this._renderHomePersonPicker()
          : this._renderAddFirstPerson()}
      </div>
    `
  }

  _renderAddFirstPerson() {
    if (!this.appState.permissions?.canAdd) {
      return ''
    }
    return html`
      <md-filled-button href="${appUrl('/new_person')}">
        <grampsjs-icon
          slot="icon"
          path="${mdiPlus}"
          color="var(--md-filled-button-label-text-color, var(--mdc-theme-on-primary))"
        ></grampsjs-icon>
        ${this._('New Person')}
      </md-filled-button>
    `
  }

  _renderHomePersonPicker() {
    return html`
      <md-outlined-button id="select-home-person" @click="${this._openPicker}">
        <grampsjs-icon
          slot="icon"
          path="${mdiPencil}"
          color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
        ></grampsjs-icon>
        ${this._('Set _Home Person')}
      </md-outlined-button>
      <grampsjs-form-select-object
        @select-object:changed="${this._handleHomePerson}"
        objectType="person"
        .appState="${this.appState}"
        id="homeperson-select"
        label="${this._('Select')}"
        fixedMenuPosition
        hideButton
      ></grampsjs-form-select-object>
    `
  }

  _openPicker() {
    this.renderRoot.querySelector('#homeperson-select')?.open()
  }

  _handleHomePerson(e) {
    const grampsId = e.detail.objects[0]?.object?.gramps_id
    if (grampsId) {
      this.appState.updateSettings({homePerson: grampsId}, true)
    }
    e.preventDefault()
    e.stopPropagation()
  }
}

window.customElements.define('grampsjs-view-tree', GrampsjsViewTree)
