import {html, css, LitElement} from 'lit'
import '@material/web/select/outlined-select.js'
import '@material/web/select/select-option.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {
  NAVIGATION_ITEMS,
  navigationConfigKey,
  navigationMode,
} from '../navigation.js'
import {fireEvent} from '../util.js'

export class GrampsjsNavigationSettings extends GrampsjsAppStateMixin(
  LitElement
) {
  static get properties() {
    return {_saving: {state: true}}
  }

  static get styles() {
    return css`
      .sections {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      md-outlined-select {
        width: 100%;
      }
    `
  }

  constructor() {
    super()
    this._saving = false
  }

  render() {
    return html`<h3>${this._('Navigation sections')}</h3>
      <p>
        ${this._(
          'Choose which sections appear in the left navigation for everyone using this family tree. Advanced sections appear in an expandable menu. Changes are saved automatically.'
        )}
      </p>
      <div class="sections">
        ${NAVIGATION_ITEMS.map(
          item => html`
            <md-outlined-select
              label=${this._(item.label).replace('_', '')}
              data-section=${item.id}
              .value=${navigationMode(this.appState, item.id)}
              ?disabled=${this._saving}
              @change=${event => this._save(item.id, event.target)}
            >
              ${['visible', 'advanced', 'hidden'].map(
                mode => html`
                  <md-select-option value=${mode}
                    ><div slot="headline">
                      ${this._(
                        {
                          visible: 'Visible',
                          advanced: 'Advanced',
                          hidden: 'Hidden',
                        }[mode]
                      )}
                    </div></md-select-option
                  >
                `
              )}
            </md-outlined-select>
          `
        )}
      </div>`
  }

  async _save(id, select) {
    this._saving = true
    try {
      const result = await this.appState.updateTreeConfig({
        [navigationConfigKey(id)]: select.value,
      })
      if ('error' in result) {
        select.value = navigationMode(this.appState, id)
        fireEvent(this, 'grampsjs:error', {message: result.error})
      }
    } finally {
      this._saving = false
    }
  }
}

window.customElements.define(
  'grampsjs-navigation-settings',
  GrampsjsNavigationSettings
)
