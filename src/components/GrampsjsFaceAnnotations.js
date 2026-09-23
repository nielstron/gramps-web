import {LitElement, html, css} from 'lit'
import {mdiDelete, mdiSelectDrag, mdiSelectionOff} from '@mdi/js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import {arrayEqual, fireEvent} from '../util.js'
import {
  linkedPeople,
  mediaRectangles,
  linkFace,
  unlinkFace,
} from '../mediaAnnotations.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsFaces.js'
import './GrampsjsRectContainer.js'
import './GrampsjsRect.js'
import '@material/web/iconbutton/icon-button.js'

export class GrampsjsFaceAnnotations extends GrampsjsAppStateMixin(LitElement) {
  static get properties() {
    return {
      data: {type: Object},
      selected: {state: true},
      drawing: {state: true},
      saving: {state: true},
      dismissed: {state: true},
    }
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          max-width: 100%;
        }
        .controls {
          display: flex;
          align-items: center;
          gap: 4px;
          min-height: 64px;
          justify-content: center;
          background: var(--md-sys-color-surface);
          color: var(--md-sys-color-on-surface);
        }
        grampsjs-rect-container {
          display: block;
          line-height: 0;
        }
        grampsjs-rect {
          line-height: normal;
        }
      `,
    ]
  }

  constructor() {
    super()
    this.data = {}
    this.selected = {}
    this.drawing = false
    this.saving = false
    this.dismissed = []
    this._autoLinked = new Set()
  }

  willUpdate(changed) {
    if (
      changed.has('data') &&
      changed.get('data')?.handle !== this.data.handle
    ) {
      this.selected = {}
      this.drawing = false
      this.dismissed = []
    }
  }

  render() {
    const rectangles = mediaRectangles(this.data)
    return html` <div class="controls">
        <grampsjs-form-select-object
          objectType="person"
          label="${this._('Person')}"
          .appState=${this.appState}
          .suggestedObjects=${linkedPeople(this.data)}
          ?disabled=${!this.selected.rect?.length || this.saving}
          @select-object:changed=${this._link}
        ></grampsjs-form-select-object>
        <md-icon-button
          aria-label=${this._('Draw a selection')}
          title=${this._('Draw a selection')}
          ?disabled=${this.saving}
          @click=${() => {
            this.selected = {}
            this.drawing = true
          }}
        >
          <grampsjs-icon path=${mdiSelectDrag}></grampsjs-icon>
        </md-icon-button>
        <md-icon-button
          aria-label=${this._('Clear selection')}
          title=${this._('Clear selection')}
          ?disabled=${this.saving ||
          (!this.selected.rect?.length && !this.drawing)}
          @click=${() => {
            this.selected = {}
            this.drawing = false
          }}
        >
          <grampsjs-icon path=${mdiSelectionOff}></grampsjs-icon>
        </md-icon-button>
        <md-icon-button
          aria-label=${this._('Delete')}
          title=${this._('Delete')}
          ?disabled=${this.saving || !this.selected.rect?.length}
          @click=${this._delete}
        >
          <grampsjs-icon path=${mdiDelete}></grampsjs-icon>
        </md-icon-button>
      </div>
      <grampsjs-rect-container
        ?draw=${this.drawing && !this.saving}
        @rect:draw=${e => {
          e.stopPropagation()
          this.selected = {rect: e.detail.rect}
        }}
      >
        <grampsjs-faces
          slot="image"
          handle=${this.data.handle}
          .appState=${this.appState}
          ?rectHidden=${this.drawing || this.saving}
          .selectedRect=${this.selected.rect || []}
          .deletedRects=${[
            ...this.dismissed,
            ...rectangles.map(obj => obj.rect),
          ]}
          @faces:detected=${this._autoLink}
          @rect:selected=${e => {
            e.stopPropagation()
            this.selected = {rect: e.detail}
          }}
        >
          <slot name="image"></slot>
          ${this.selected.rect?.length
            ? html`<grampsjs-rect
                selected
                .rect=${this.selected.rect}
                label=${this.selected.label || '?'}
              ></grampsjs-rect>`
            : ''}
        </grampsjs-faces>
        ${this.drawing
          ? ''
          : rectangles.map(
              obj => html` <grampsjs-rect
                .rect=${obj.rect}
                label=${obj.label}
                ?selected=${arrayEqual(obj.rect, this.selected.rect || [])}
                @rect:clicked=${e => {
                  e.stopPropagation()
                  if (!this.saving) this.selected = obj
                }}
              ></grampsjs-rect>`
            )}
      </grampsjs-rect-container>`
  }

  async _link(e) {
    e.stopPropagation()
    const [person] = e.detail.objects
    e.currentTarget.reset()
    await this._saveLink(person)
  }

  async _saveLink(person, onlyIfUnannotated = false) {
    this.saving = true
    try {
      const result = await linkFace(this.appState, {
        personHandle: person.handle ?? person.object.handle,
        mediaHandle: this.data.handle,
        rect: this.selected.rect,
        oldHandle: this.selected.handle,
        oldType: this.selected.type,
        onlyIfUnannotated,
      })
      this._saved(result)
    } finally {
      this.saving = false
    }
  }

  async _autoLink(e) {
    e.stopPropagation()
    const people = linkedPeople(this.data)
    const rects = e.detail.rects
    if (
      !this.appState.permissions?.canEdit ||
      this.saving ||
      people.length !== 1 ||
      rects.length !== 1
    )
      return
    const [person] = people
    const ref = person.object.media_list.find(
      item => item.ref === this.data.handle
    )
    const key = `${this.data.handle}:${person.handle}`
    if (ref?.rect?.length || this._autoLinked.has(key)) return
    this._autoLinked.add(key)
    this.selected = {rect: rects[0]}
    await this._saveLink(person, true)
  }

  async _delete() {
    if (!this.selected.handle) {
      this.dismissed = [...this.dismissed, this.selected.rect]
      this.selected = {}
      return
    }
    this.saving = true
    try {
      this._saved(
        await unlinkFace(this.appState, {
          objHandle: this.selected.handle,
          objType: this.selected.type,
          mediaHandle: this.data.handle,
          rect: this.selected.rect,
        })
      )
    } finally {
      this.saving = false
    }
  }

  _saved(result) {
    if ('error' in result) {
      fireEvent(this, 'grampsjs:error', {message: result.error})
      return
    }
    this.selected = {}
    this.drawing = false
    fireEvent(this, 'annotations:changed')
  }
}
window.customElements.define(
  'grampsjs-face-annotations',
  GrampsjsFaceAnnotations
)
