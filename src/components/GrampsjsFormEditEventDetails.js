/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormSelectDate.js'
import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormString.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {
  degreeFromEvent,
  isAcademicEvent,
  withDegreeAttribute,
} from '../degree.js'

class GrampsjsFormEditEventDetails extends GrampsjsObjectForm {
  static get properties() {
    return {
      place: {type: Object},
      eventType: {type: Object},
    }
  }

  constructor() {
    super()
    this.place = {}
    this.eventType = ''
  }

  renderForm() {
    return html`
      <h4 class="label">${this._('Date')}</h4>
      <p>
        <grampsjs-form-select-date
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="date"
          label="${this._('Date')}"
          .data="${this.data.date}"
          .appState="${this.appState}"
        >
        </grampsjs-form-select-date>
      </p>
      ${isAcademicEvent({type: this.eventType})
        ? html`
            <h4 class="label">${this._('Degree')}</h4>
            <p>
              <grampsjs-form-string
                fullwidth
                id="event-degree"
                @formdata:changed="${this._handleFormData}"
                label="${this._('Degree')}"
                value="${degreeFromEvent(this.data)}"
                .appState="${this.appState}"
              ></grampsjs-form-string>
            </p>
          `
        : ''}
      <h4 class="label">${this._('Place')}</h4>
      <p>
        <grampsjs-form-select-object-list
          fixedMenuPosition
          style="min-height: 300px;"
          objectType="place"
          .appState="${this.appState}"
          id="place"
          label="${this._('Select')}"
          .objectsInitial="${this.data.place
            ? [
                {
                  object_type: 'place',
                  object: this.place,
                  handle: this.data.place,
                },
              ]
            : []}"
          class="edit"
        ></grampsjs-form-select-object-list>
      </p>
    `
  }

  get isValid() {
    return this._areDateSelectValid()
  }

  _handleFormData(e) {
    const originalTarget = e.composedPath()[0]
    super._handleFormData(e)
    if (originalTarget.id === 'event-degree') {
      this.data = withDegreeAttribute(this.data, e.detail.data)
    }
  }
}

window.customElements.define(
  'grampsjs-form-edit-event-details',
  GrampsjsFormEditEventDetails
)
