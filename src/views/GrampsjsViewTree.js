import {css, html} from 'lit'

import '@material/web/tabs/tabs'
import '@material/web/tabs/primary-tab'

import {mdiFamilyTree, mdiTransitConnectionVariant} from '@mdi/js'
import {GrampsjsView} from './GrampsjsView.js'
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
      return html`
        <div class="with-margin">
          <p>
            ${this._('No Home Person set.')}
            <a href="${appUrl('/')}">${this._('Home')}</a>
          </p>
        </div>
      `
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
    window.addEventListener(
      'pedigree:person-selected',
      this._selectPerson.bind(this)
    )
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
}

window.customElements.define('grampsjs-view-tree', GrampsjsViewTree)
