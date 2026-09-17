/*
Component showing the relationship string for two people by handle
*/

import {html} from 'lit'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'

const DISTANT_NAMED_GENERATION = 25

export function formatDistantGermanLinealRelationship(data, sex = 'U') {
  const distanceHome = data?.distance_common_origin
  const distanceOther = data?.distance_common_other
  const directDistance =
    distanceOther === 0 ? distanceHome : distanceHome === 0 ? distanceOther : 0
  if (directDistance <= DISTANT_NAMED_GENERATION) return null

  const prefix = `Ur${'ur'.repeat(directDistance - 3)}`
  if (distanceOther === 0) {
    return `${prefix}${
      {M: 'großvater', F: 'großmutter'}[sex] || 'großelternteil'
    }`
  }
  return `${prefix}${{M: 'enkel', F: 'enkelin'}[sex] || 'enkelkind'}`
}

export class GrampsjsPersonRelationship extends GrampsjsConnectedComponent {
  static get properties() {
    return {
      person1: {type: String},
      person2: {type: String},
      person2Sex: {type: String},
      relationshipData: {type: Object},
    }
  }

  constructor() {
    super()
    this.person1 = ''
    this.person2 = ''
    this.person2Sex = 'U'
    this.relationshipData = undefined
  }

  getUrl() {
    if (this.relationshipData !== undefined) return ''
    return `/api/relations/${this.person1}/${this.person2}?depth=100&locale=${
      this.appState.i18n.lang || 'en'
    }`
  }

  // eslint-disable-next-line class-methods-use-this
  renderLoading() {
    return html`<span class="skeleton" style="width:7em;">&nbsp;</span>`
  }

  renderContent() {
    const data = this.relationshipData ?? this._data?.data
    const relation = data?.relationship_string
    const distantGermanRelation = this.appState.i18n.lang?.startsWith('de')
      ? formatDistantGermanLinealRelationship(data, this.person2Sex)
      : null
    if (this.person1 === this.person2) {
      return html`${this._('self')}`
    }
    if (relation === undefined) {
      return html`&nbsp;`
    }
    if (distantGermanRelation) {
      return html`${distantGermanRelation}`
    }
    if (relation === '') {
      return html`${this._('Not Related')}`
    }
    return html`${relation}`
  }

  render() {
    if (this.relationshipData !== undefined) return this.renderContent()
    return super.render()
  }
}

window.customElements.define(
  'grampsjs-person-relationship',
  GrampsjsPersonRelationship
)
