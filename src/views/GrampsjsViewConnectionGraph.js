import {css, html} from 'lit'

import '@material/web/button/outlined-button.js'
import '@material/web/switch/switch.js'

import {mdiAccountSearch, mdiSwapHorizontal} from '@mdi/js'
import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsFormSelectObject.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsPathConnectionChart.js'
import {
  chartNameDisplayFormat,
  fireEvent,
  personProfileDisplayName,
} from '../util.js'
import {getTreePath} from '../treeDefaults.js'

export function connectionContextHandles(steps, families) {
  const familiesByHandle = new Map(
    families.map(family => [family.handle, family])
  )
  const pathHandles = new Set(
    steps.flatMap(step => [step.from_handle, step.to_handle])
  )
  const contextHandles = new Set()
  for (const step of steps) {
    if (!['child', 'parent', 'sibling'].includes(step.relation)) continue
    const family = familiesByHandle.get(step.family_handle)
    if (!family) continue
    for (const handle of [family.father_handle, family.mother_handle]) {
      if (handle && !pathHandles.has(handle)) contextHandles.add(handle)
    }
  }
  return [...contextHandles]
}

export class GrampsjsViewConnectionGraph extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          margin: 0;
        }

        .connection-controls {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 10px 0 18px;
        }

        .endpoint {
          color: var(--grampsjs-body-font-color-90);
          font-weight: 600;
        }

        .separator {
          color: var(--grampsjs-body-font-color-40);
        }

        .context-toggle {
          align-items: center;
          cursor: pointer;
          display: flex;
          gap: 8px;
          margin-left: auto;
        }

        .message {
          margin: 36px 0;
          text-align: center;
        }

        grampsjs-path-connection-chart {
          display: block;
          height: calc(100vh - 235px);
          min-height: 360px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      targetGrampsId: {type: String},
      _source: {type: Object},
      _target: {type: Object},
      _people: {type: Array},
      _families: {type: Array},
      _path: {type: Object},
      showCloseRelatives: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.targetGrampsId = ''
    this._source = null
    this._target = null
    this._people = []
    this._families = []
    this._path = null
    this.showCloseRelatives = true
    this._requestId = 0
  }

  update(changed) {
    super.update(changed)
    if (
      changed.has('grampsId') ||
      changed.has('targetGrampsId') ||
      changed.has('active')
    ) {
      this._fetchPath()
    }
  }

  renderContent() {
    return html`
      <div class="connection-controls">
        <span class="endpoint"
          >${personProfileDisplayName(this._source?.profile) ||
          this.grampsId}</span
        >
        <span class="separator">↔</span>
        ${this._target
          ? html`<span class="endpoint"
              >${personProfileDisplayName(this._target.profile)}</span
            >`
          : ''}
        <grampsjs-form-select-object
          id="target-picker"
          objectType="person"
          .appState=${this.appState}
          .iconPath=${mdiAccountSearch}
          label=${this._target
            ? this._('Change person')
            : this._('Choose person')}
          @select-object:changed=${this._handleTargetSelected}
        ></grampsjs-form-select-object>
        ${this._target
          ? html`<md-outlined-button @click=${this._swapEndpoints}>
              <grampsjs-icon
                slot="icon"
                .path=${mdiSwapHorizontal}
                color="var(--mdc-theme-primary)"
              ></grampsjs-icon>
              ${this._('Swap')}
            </md-outlined-button>`
          : ''}
        ${this._path?.connected
          ? html`<label class="context-toggle">
              <md-switch
                ?selected=${this.showCloseRelatives}
                @input=${this._handleCloseRelativesToggle}
              ></md-switch>
              <span>${this._('Show close relatives')}</span>
            </label>`
          : ''}
      </div>
      ${this.loading
        ? html`<div class="message">${this._('Loading...')}</div>`
        : !this.targetGrampsId
        ? html`<div class="message">
            ${this._('Choose a second person to find their connection.')}
          </div>`
        : this._path && !this._path.connected
        ? html`<div class="message">${this._('No connection found.')}</div>`
        : this._path?.connected
        ? html`<grampsjs-path-connection-chart
            .appState=${this.appState}
            .data=${this._visiblePeople}
            .steps=${this._path.steps}
            .contextFamilies=${this.showCloseRelatives ? this._families : []}
            .grampsId=${this.grampsId}
            .nameDisplayFormat=${this.appState?.settings
              ?.relationshipChartNameDisplayFormat ??
            chartNameDisplayFormat.surnameThenGiven}
          ></grampsjs-path-connection-chart>`
        : ''}
    `
  }

  async _personByGrampsId(grampsId) {
    const lang = this.appState.i18n.lang || 'en'
    const result = await this.appState.apiGet(
      `/api/people/?gramps_id=${encodeURIComponent(
        grampsId
      )}&locale=${lang}&profile=self`
    )
    return result.data?.[0] ?? null
  }

  async _fetchPath() {
    if (!this.active || !this.grampsId) return
    const requestId = ++this._requestId
    this.loading = true
    this._path = null
    this._people = []
    this._families = []
    if (!this.targetGrampsId) {
      this._source = await this._personByGrampsId(this.grampsId)
      this._target = null
      this.loading = false
      return
    }

    const lang = this.appState.i18n.lang || 'en'
    const result = await this.appState.apiGet(
      `/api/views/connection-graph/${encodeURIComponent(
        this.grampsId
      )}/${encodeURIComponent(this.targetGrampsId)}?locale=${lang}`
    )
    if (requestId !== this._requestId) return
    if (!('data' in result)) {
      this.loading = false
      this.error = true
      this._errorMessage = result.error
      return
    }
    this._path = result.data.path
    this._people = result.data.people
    this._families = result.data.families
    this._source = this._people.find(
      person => person.gramps_id === this.grampsId
    )
    this._target = this._people.find(
      person => person.gramps_id === this.targetGrampsId
    )
    this.loading = false
  }

  get _visiblePeople() {
    if (this.showCloseRelatives) return this._people
    const pathHandles = new Set(this._path?.person_handles || [])
    return this._people.filter(person => pathHandles.has(person.handle))
  }

  _handleCloseRelativesToggle(event) {
    this.showCloseRelatives = event.target.selected
  }

  _handleTargetSelected(event) {
    const person = event.detail.objects[0]?.object
    if (!person?.gramps_id) return
    fireEvent(this, 'nav', {
      path: getTreePath('connection', this.grampsId, person.gramps_id),
    })
  }

  _swapEndpoints() {
    fireEvent(this, 'nav', {
      path: getTreePath('connection', this.targetGrampsId, this.grampsId),
    })
  }
}

window.customElements.define(
  'grampsjs-view-connection-graph',
  GrampsjsViewConnectionGraph
)
