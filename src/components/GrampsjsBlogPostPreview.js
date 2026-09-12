import './GrampsjsImg.js'
import {blogCoverHandle} from '../blogCover.js'
import {isMarkdownNote, markdownPreview} from '../blogMarkdown.js'
import {html, css, LitElement} from 'lit'
import {sharedStyles} from '../SharedStyles.js'
import '@material/mwc-button'

import './GrampsjsNoteContent.js'
import './GrampsjsTimedelta.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsBlogPostPreview extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        h3 {
          font-family: var(--grampsjs-heading-font-family);
          font-size: 20px;
          margin-bottom: 20px;
          font-weight: 400;
          margin-top: 0;
          line-height: 1.3em;
          min-height: 2.6em;
          color: var(--grampsjs-body-font-color-75);
        }

        #image {
          width: 170px;
          flex-shrink: 0;
          text-align: right;
        }

        #note {
          flex-grow: 1;
          font-size: 17px;
          font-weight: 300;
          color: var(--grampsjs-body-font-color-70);
          line-height: 1.45em;
        }

        #date {
          color: var(--grampsjs-body-font-color-60);
          font-size: 14px;
          letter-spacing: 0.02em;
          margin: 2em 0;
          font-weight: 250;
        }

        .clear {
          clear: both;
        }

        #content {
          display: flex;
        }

        @media (max-width: 500px) {
          #image {
            display: none;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = {}
  }

  render() {
    if (Object.keys(this.data).length === 0) {
      return html``
    }
    return html`
      <div class="blog-preview">
        <h3>${this.data.title}</h3>
        <div id="content">
          <div id="note">${this.getPreviewText()}</div>
          ${blogCoverHandle(this.data)
            ? html`<div id="image">
                <grampsjs-img
                  handle=${blogCoverHandle(this.data)}
                  size="200"
                  displayHeight="150"
                  square
                ></grampsjs-img>
              </div>`
            : ''}
        </div>
        <div class="clear"></div>
        <div id="date">
          ${this.appState.i18n.lang
            ? html`<grampsjs-timedelta
                timestamp="${this.data.change}"
                locale="${this.appState.i18n.lang}"
              ></grampsjs-timedelta>`
            : ''}
        </div>
      </div>
    `
  }

  getPreviewText() {
    const note = this.data?.extended?.notes[0]
    const all = isMarkdownNote(note)
      ? markdownPreview(note.text.string)
      : note?.text?.string
    if (!all) {
      return ''
    }
    const re = /[\s\S]{250}[^\s]{0,50}\s?/g
    const match = all.match(re)
    if (match === null) {
      return all
    }
    return `${match[0]} ...`
  }
}

window.customElements.define(
  'grampsjs-blog-post-preview',
  GrampsjsBlogPostPreview
)
