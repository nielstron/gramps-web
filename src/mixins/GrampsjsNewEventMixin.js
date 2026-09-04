import {html} from 'lit'

import '@material/mwc-textfield'

import '../components/GrampsjsFormSelectDate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'
import {
  eventTitleAttributeType,
  eventTitleFromEvent,
  isTitleEvent,
  withEventTitleAttribute,
} from '../degree.js'

export const GrampsjsNewEventMixin = superClass =>
  class extends superClass {
    renderForm() {
      return html`
        <h3 class="label">${this._('Type')}</h3>
        <grampsjs-form-select-type
          required
          noheading
          id="event-type"
          .appState="${this.appState}"
          ?loadingTypes="${this.loadingTypes}"
          typeName="event_types"
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
        >
        </grampsjs-form-select-type>

        <h3 class="label">${this._('Date')}</h3>
        <p>
          <grampsjs-form-select-date id="date" .appState="${this.appState}">
          </grampsjs-form-select-date>
        </p>

        <h3 class="label">${this._('Description')}</h3>
        <p>
          <grampsjs-form-string
            fullwidth
            id="description"
            @formdata:changed="${this._handleFormData}"
            label="${this._('Description')}"
            .appState="${this.appState}"
          >
          </grampsjs-form-string>
        </p>

        ${isTitleEvent(this.data)
          ? html`
              <h3 class="label">
                ${this._(eventTitleAttributeType(this.data))}
              </h3>
              <p>
                <grampsjs-form-string
                  fullwidth
                  id="event-title"
                  @formdata:changed="${this._handleFormData}"
                  label="${this._(eventTitleAttributeType(this.data))}"
                  value="${eventTitleFromEvent(this.data)}"
                  .appState="${this.appState}"
                ></grampsjs-form-string>
              </p>
            `
          : ''}

        <h3 class="label">${this._('Place')}</h3>
        <grampsjs-form-select-object-list
          fixedMenuPosition
          id="place"
          objectType="place"
          .appState="${this.appState}"
        ></grampsjs-form-select-object-list>

        ${this._renderCitationForm()} ${this._renderTagsForm()}

        <div class="spacer"></div>
        <grampsjs-form-private
          id="private"
          .appState="${this.appState}"
        ></grampsjs-form-private>
      `
    }

    _handleFormData(e) {
      const originalTarget = e.composedPath()[0]
      super._handleFormData(e)
      if (originalTarget.id === 'event-title') {
        this.data = withEventTitleAttribute(this.data, e.detail.data)
      }
    }
  }
