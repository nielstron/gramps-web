import {html, css} from 'lit'
import '@material/web/button/outlined-button'
import '@material/web/chips/chip-set'
import '@material/web/chips/filter-chip'
import {
  mdiFamilyTree,
  mdiAccountMultiplePlus,
  mdiDna,
  mdiSearchWeb,
  mdiTimelineOutline,
  mdiMap,
  mdiImagePlus,
  mdiPlus,
} from '@mdi/js'
import {GrampsjsObject} from './GrampsjsObject.js'
import {asteriskIcon, crossIcon} from '../icons.js'
import './GrampsjsImg.js'
import './GrampsjsEditGender.js'
import './GrampsjsPersonRelationship.js'
import './GrampsjsFormExternalSearch.js'
import './GrampsjsFormNewMedia.js'
import './GrampsjsTreeChartAddPerson.js'
import {fireEvent, objectIconPath} from '../util.js'
import {formatDateString} from '../date.js'
import {surnameWithBirthName} from '../name.js'

export class GrampsjsPerson extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        .events-chips {
          margin-bottom: 16px;
        }

        .events-chips md-filter-chip {
          --md-sys-color-secondary-container: var(
            --md-sys-color-surface-variant
          );
          --md-sys-color-on-secondary-container: var(
            --md-sys-color-on-surface-variant
          );
        }

        #picture {
          float: none;
          margin: 0 auto 24px;
          text-align: center;
        }

        .profile-picture,
        .profile-picture-placeholder {
          width: 160px;
          height: 160px;
          margin-right: auto;
          margin-left: auto;
          border-radius: 50%;
          overflow: hidden;
        }

        button.profile-picture {
          display: block;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .profile-picture grampsjs-img {
          width: 100%;
          height: 100%;
        }

        .profile-picture-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          padding: 0;
          border: 1px dashed var(--md-sys-color-outline);
          color: var(--md-sys-color-on-surface-variant);
          background: var(--md-sys-color-surface-container-highest);
        }

        button.profile-picture-placeholder {
          cursor: pointer;
        }

        button.profile-picture-placeholder:hover {
          background: var(--md-sys-color-surface-variant);
        }

        .preview-add-relative {
          margin-top: 12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #1976d2;
          --md-icon-button-icon-size: 19px;
          --md-icon-button-icon-color: #ffffff;
          --md-icon-button-icon-opacity: 1;
        }

        :host([preview]) #picture {
          float: right;
          margin: 0 0 8px 16px;
        }

        :host([preview]) .profile-picture,
        :host([preview]) .profile-picture-placeholder {
          width: 72px;
          height: 72px;
        }

        :host([preview]) h2 {
          margin-top: 0;
          font-size: 22px;
        }

        @container (max-width: 500px) {
          .profile-picture,
          .profile-picture-placeholder {
            width: 112px;
            height: 112px;
          }
        }

        @container (min-width: 600px) {
          #picture {
            float: right;
            margin: 0 0 24px 32px;
            text-align: right;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      homePersonDetails: {type: Object},
      timelineData: {type: Array},
      _showFamilyEvents: {type: Boolean},
      _showRelatedEvents: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.homePersonDetails = {}
    this._objectsName = 'People'
    this._objectEndpoint = 'people'
    this._objectIcon = objectIconPath.person
    this._showReferences = false
    this.timelineData = []
    this._showFamilyEvents = false
    this._showRelatedEvents = false
  }

  renderPicture() {
    if (this.data?.media_list?.length) {
      const ref = this.data.media_list[0]
      const obj = this.data.extended.media[0]
      const label = this._('Add profile picture')
      return html`
        <button
          class="profile-picture"
          type="button"
          aria-label="${label}"
          title="${label}"
          @click="${this._handleAddProfilePictureClick}"
        >
          <grampsjs-img
            handle="${obj.handle}"
            size="200"
            .rect="${ref.rect || []}"
            square
            circle
            cover
            mime="${obj.mime}"
            checksum="${obj.checksum}"
          ></grampsjs-img>
        </button>
      `
    }

    if (this.preview) {
      return html``
    }

    const label = this._('Add profile picture')
    if (
      this.appState?.permissions?.canAdd &&
      this.appState?.permissions?.canEdit
    ) {
      return html`
        <button
          class="profile-picture-placeholder"
          type="button"
          aria-label="${label}"
          title="${label}"
          @click="${this._handleAddProfilePictureClick}"
        >
          <grampsjs-icon
            path="${mdiImagePlus}"
            height="40"
            color="var(--md-sys-color-on-surface-variant)"
          ></grampsjs-icon>
        </button>
      `
    }

    return html`<div class="profile-picture-placeholder"></div>`
  }

  _handleAddProfilePictureClick() {
    this.dialogContent = html`
      <grampsjs-form-new-media
        @object:save="${this._handleNewProfilePictureSave}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        dialogTitle="${this._('Add profile picture')}"
      ></grampsjs-form-new-media>
    `
  }

  async _handleNewProfilePictureSave(e) {
    e.preventDefault()
    e.stopPropagation()
    const uploadForm = this.renderRoot.querySelector('grampsjs-form-new-media')
    this.dialogContent = ''
    const data = await uploadForm.upload(e.detail.data)
    if ('data' in data) {
      fireEvent(this, 'edit:action', {
        action: 'updateProp',
        data: {
          media_list: [
            {ref: data.data.handle},
            ...(this.data.media_list || []),
          ],
        },
      })
    }
  }

  renderProfile() {
    return html`
      <h2>
        <grampsjs-edit-gender
          ?edit="${this.edit}"
          gender="${this.data.gender}"
        ></grampsjs-edit-gender>
        ${this._displayName()}
      </h2>
      ${this._renderBirth()} ${this._renderDeath()} ${this._renderRelation()}
      ${this.preview
        ? this.appState?.permissions?.canAdd
          ? html`
              <md-icon-button
                class="preview-add-relative"
                title="${this._('Add Family Member')}"
                aria-label="${this._('Add Family Member')}"
                @click="${this._handleAddFamilyMemberClick}"
              >
                <grampsjs-icon
                  path="${mdiPlus}"
                  color="#ffffff"
                ></grampsjs-icon>
              </md-icon-button>
            `
          : ''
        : html`<p class="button-list">
            ${this._renderTreeBtn()} ${this._renderTimelineBtn()}
            ${this._renderMapBtn()} ${this._renderDnaBtn()}
            ${this._renderAddFamilyMemberBtn()}
            ${this._renderExternalSearchBtn()}
          </p>`}
      ${this.appState?.permissions?.canAdd
        ? html`<grampsjs-tree-chart-add-person
            id="add-family-member"
            .appState="${this.appState}"
          ></grampsjs-tree-chart-add-person>`
        : ''}
    `
  }

  _displayName() {
    if (!this.data.profile) {
      return ''
    }
    const surname = surnameWithBirthName(this.data, this._('born')) || '…'
    const suffix = this.data.profile.name_suffix || ''
    const call = this.data?.primary_name?.call
    let given = this.data.profile.name_given || call || '…'
    const callIndex = call && call !== given ? given.search(call) : -1
    given =
      callIndex > -1
        ? html`
            ${given.substring(0, callIndex)}
            <span class="given-name"
              >${given.substring(callIndex, callIndex + call.length)}</span
            >
            ${given.substring(callIndex + call.length)}
          `
        : given
    return html`${given} ${surname} ${suffix}`
  }

  _renderBirth() {
    const obj = this.data?.profile?.birth
    if (obj === undefined || Object.keys(obj).length === 0) {
      return ''
    }
    return html`
      <span class="event">
        <i>${asteriskIcon}</i>
        ${formatDateString(obj.date)} ${obj.place ? this._('in') : ''}
        ${obj.place_name || obj.place || ''}
      </span>
    `
  }

  _renderDeath() {
    const obj = this.data?.profile?.death
    if (obj === undefined || Object.keys(obj).length === 0) {
      return ''
    }
    return html`
      <span class="event">
        <i>${crossIcon}</i>
        ${formatDateString(obj.date)} ${obj.place ? this._('in') : ''}
        ${obj.place_name || obj.place || ''}
      </span>
    `
  }

  _renderRelation() {
    if (!this.homePersonDetails.handle) {
      // no home person set
      return ''
    }
    return html`
      <dl>
        <dt>${this._('Relationship to home person')}</dt>
        <dd>
          <grampsjs-person-relationship
            person1="${this.homePersonDetails.handle}"
            person2="${this.data.handle}"
            .appState="${this.appState}"
          ></grampsjs-person-relationship>
        </dd>
      </dl>
    `
  }

  _renderTreeBtn() {
    return html`
      <md-outlined-button @click="${this._handleTreeButtonClick}">
        ${this._('Show in tree')}
        <grampsjs-icon
          path="${mdiFamilyTree}"
          color="var(--mdc-theme-primary)"
          slot="icon"
        >
        </grampsjs-icon>
      </md-outlined-button>
    `
  }

  _renderTimelineBtn() {
    return html`
      <md-outlined-button @click="${this._handleTimelineButtonClick}">
        ${this._('Show on timeline')}
        <grampsjs-icon
          path="${mdiTimelineOutline}"
          color="var(--mdc-theme-primary)"
          slot="icon"
        ></grampsjs-icon>
      </md-outlined-button>
    `
  }

  _renderAddFamilyMemberBtn() {
    if (!this.appState?.permissions?.canAdd) return ''
    return html`
      <md-outlined-button @click="${this._handleAddFamilyMemberClick}">
        ${this._('Add Family Member')}
        <grampsjs-icon
          path="${mdiAccountMultiplePlus}"
          color="var(--mdc-theme-primary)"
          slot="icon"
        ></grampsjs-icon>
      </md-outlined-button>
    `
  }

  _handleAddFamilyMemberClick() {
    this.renderRoot.querySelector('#add-family-member')?.open(this.data)
  }

  _renderMapBtn() {
    return html`
      <md-outlined-button @click="${this._handleMapButtonClick}">
        ${this._('Open in map')}
        <grampsjs-icon
          path="${mdiMap}"
          color="var(--mdc-theme-primary)"
          slot="icon"
        ></grampsjs-icon>
      </md-outlined-button>
    `
  }

  _renderExternalSearchBtn() {
    return html`
      <md-outlined-button @click="${this._handleExternalSearchClick}">
        ${this._('External Search')}
        <grampsjs-icon
          path="${mdiSearchWeb}"
          color="var(--mdc-theme-primary)"
          slot="icon"
        >
        </grampsjs-icon>
      </md-outlined-button>
    `
  }

  _renderDnaBtn() {
    if (!this.data?.person_ref_list?.filter(ref => ref.rel === 'DNA').length) {
      // no DNA data
      return ''
    }
    return html`
      <md-outlined-button
        @click="${this._handleDnaButtonClick}"
        class="dna-btn"
      >
        ${this._('DNA matches')}
        <grampsjs-icon
          path="${mdiDna}"
          color="var(--mdc-theme-primary)"
          slot="icon"
        ></grampsjs-icon>
      </md-outlined-button>
    `
  }

  _handleTreeButtonClick() {
    this.dispatchEvent(
      new CustomEvent('pedigree:person-selected', {
        bubbles: true,
        composed: true,
        detail: {grampsId: this.data.gramps_id},
      })
    )
    fireEvent(this, 'nav', {path: 'tree'})
  }

  _handleTimelineButtonClick() {
    window.dispatchEvent(
      new CustomEvent('timeline:person-selected', {
        detail: {object: this.data},
      })
    )
    fireEvent(this, 'nav', {path: 'timeline'})
  }

  _handleMapButtonClick() {
    window.dispatchEvent(
      new CustomEvent('map:person-selected', {
        detail: {person: this.data},
      })
    )
    fireEvent(this, 'nav', {path: 'map'})
  }

  _handleExternalSearchClick() {
    // Helper to extract year from date string (format: "YYYY-MM-DD" or "YYYY")
    const extractYear = dateStr => {
      if (!dateStr) return ''
      const match = dateStr.match(/^\d{4}/)
      return match ? match[0] : ''
    }
    const data = {
      name_given: this.data?.profile?.name_given,
      name_surname: this.data?.profile?.name_surname,
      name_middle: this.data?.profile?.name_given?.split(' ')[1] || '',
      place_name:
        this.data?.profile?.birth?.place_name ||
        this.data?.profile?.birth?.place ||
        this.data?.profile?.death?.place_name ||
        this.data?.profile?.death?.place ||
        '',
      birth_year: extractYear(this.data?.profile?.birth?.date),
      death_year: extractYear(this.data?.profile?.death?.date),
    }
    this.dialogContent = html`
      <div>
        <grampsjs-form-external-search
          @object:cancel=${this._handleCancelDialog}
          .appState="${this.appState}"
          .data=${data}
          .dialogTitle=${this._('External Search')}
          .hideSaveButton=${true}
        >
        </grampsjs-form-external-search>
      </div>
    `
  }

  _handleCancelDialog() {
    this.dialogContent = ''
  }

  _handleDnaButtonClick() {
    fireEvent(this, 'nav', {path: `dna-matches/${this.data.gramps_id}`})
  }

  _handleFamilyEventsToggle(e) {
    this._showFamilyEvents = e.target.selected
    if (this._showFamilyEvents || this._showRelatedEvents) {
      fireEvent(this, 'person:timeline-needed')
    }
  }

  _handleRelatedEventsToggle(e) {
    this._showRelatedEvents = e.target.selected
    if (this._showFamilyEvents || this._showRelatedEvents) {
      fireEvent(this, 'person:timeline-needed')
    }
  }

  // Build a single combined ordered list from the timeline. Personal events
  // are always included; family/related are gated by their toggle. The
  // timeline API returns events in chronological order, so we preserve that
  // ordering.
  _getCombinedTimelineEvents() {
    const personalHandles = new Set(
      (this.data?.extended?.events || []).map(e => e.handle)
    )
    const familyEventHandles = new Set(
      (this.data?.extended?.families || [])
        .flatMap(f => f.event_ref_list || [])
        .map(er => er.ref)
    )

    // The timeline API returns events in chronological order. Use each
    // event's position in that array as a sort key so we can interleave
    // personal and family/related events correctly.
    const timelineOrder = new Map(
      this.timelineData.map((te, i) => [te.handle, i])
    )
    const timelineAge = new Map(
      this.timelineData.map(te => [te.handle, te.age || ''])
    )

    const entries = []

    // Personal events: always from main data (timeline may omit undated ones).
    for (const [i, event] of (this.data?.extended?.events || []).entries()) {
      const sortKey = timelineOrder.has(event.handle)
        ? timelineOrder.get(event.handle)
        : event.date?.sortval ?? Infinity
      const baseProfile = (this.data?.profile?.events || [])[i] || {}
      entries.push({
        sortKey,
        data: event,
        profile: {...baseProfile, age: timelineAge.get(event.handle) || ''},
      })
    }

    // Family/related events: only from timeline.
    for (const te of this.timelineData) {
      if (personalHandles.has(te.handle)) continue
      if (familyEventHandles.has(te.handle)) {
        if (!this._showFamilyEvents) continue
      } else {
        if (!this._showRelatedEvents) continue
      }
      const isRelated = !familyEventHandles.has(te.handle)
      const personName = isRelated
        ? [te.person?.name_given, te.person?.name_surname]
            .filter(Boolean)
            .join(' ')
        : ''
      entries.push({
        sortKey: timelineOrder.get(te.handle),
        data: {
          gramps_id: te.gramps_id,
          handle: te.handle,
          type: te.type,
          description: te.description || '',
          media_list: (te.media || []).map(h => ({ref: h})),
        },
        profile: {
          type: this._(te.type),
          date: te.date || '',
          place: te.place?.name || '',
          place_name: te.place?.name || '',
          role: isRelated ? te.person?.relationship || '' : '',
          summary: te.label || te.type || '',
          context: isRelated ? personName : this._('Family'),
          age: te.age || '',
        },
      })
    }

    entries.sort((a, b) => a.sortKey - b.sortKey)

    return {
      data: entries.map(e => e.data),
      profile: entries.map(e => e.profile),
    }
  }

  renderSectionContent(sectionKey) {
    if (sectionKey !== 'events' || this.edit) {
      return super.renderSectionContent(sectionKey)
    }

    const hasFamilies =
      (this.data?.family_list?.length || 0) +
        (this.data?.parent_family_list?.length || 0) >
      0

    const chips = hasFamilies
      ? html`
          <div class="events-chips">
            <md-chip-set>
              <md-filter-chip
                label="${this._('Personal')}"
                selected
                @click="${e => {
                  e.target.selected = true
                }}"
              ></md-filter-chip>
              <md-filter-chip
                label="${this._('Family')}"
                ?selected="${this._showFamilyEvents}"
                @click="${this._handleFamilyEventsToggle}"
              ></md-filter-chip>
              <md-filter-chip
                label="${this._('Relatives')}"
                ?selected="${this._showRelatedEvents}"
                @click="${this._handleRelatedEventsToggle}"
              ></md-filter-chip>
            </md-chip-set>
          </div>
        `
      : ''

    // While neither toggle is active (or timeline not yet loaded), show
    // the normal personal events list with full edit capability.
    if (
      (!this._showFamilyEvents && !this._showRelatedEvents) ||
      !this.timelineData.length
    ) {
      return html`
        ${chips}
        <grampsjs-events
          hasShare
          hasAdd
          hasEdit
          defaultRole="Primary"
          .appState="${this.appState}"
          .data=${this.data?.extended?.events}
          .profile=${this.data?.profile?.events}
          .eventRef=${this.data?.event_ref_list}
        ></grampsjs-events>
      `
    }

    // Combined chronological view using the timeline endpoint.
    const {data, profile} = this._getCombinedTimelineEvents()
    return html`
      ${chips}
      <grampsjs-events
        .appState="${this.appState}"
        .data=${data}
        .profile=${profile}
      ></grampsjs-events>
    `
  }
}

window.customElements.define('grampsjs-person', GrampsjsPerson)
