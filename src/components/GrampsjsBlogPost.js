import './GrampsjsBlogCover.js'
import './GrampsjsBlogAuthor.js'
import './GrampsjsMarkdown.js'
import {isMarkdownNote} from '../blogMarkdown.js'
import {blogPublicationTimestamp} from '../blogPublication.js'
import {html, css, LitElement} from 'lit'
import {sharedStyles} from '../SharedStyles.js'
import '@material/web/button/outlined-button.js'

import './GrampsjsNoteContent.js'
import './GrampsjsTimedelta.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsBlogPost extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        h2 {
          color: var(--grampsjs-note-color);
          font-weight: 530;
          font-size: 37px;
          padding-bottom: 0.75em;
          margin-bottom: 0.5em;
          padding-top: 0.5em;
          text-align: center;
          border-bottom: 2px solid var(--grampsjs-note-color);
        }

        h3.author {
          font-family: var(--grampsjs-body-font-family);
          font-weight: 300;
          font-size: 16px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 60px;
          text-align: center;
        }

        #img-container grampsjs-img {
          display: flex;
          justify-content: center;
        }

        #image {
          margin-top: 2em;
          margin-bottom: 3em;
        }

        #note {
          margin: 4em 0em;
        }

        #note-wrapper {
          margin: 0 auto;
          max-width: 40em;
        }

        grampsjs-note-content {
          --grampsjs-note-line-height: 1.7em;
          --grampsjs-note-font-size: 18px;
          --grampsjs-note-font-family: 'EB Garamond x';
        }

        #btn-details {
          margin-top: 2em;
        }

        @media (min-width: 768px) {
          h2 {
            font-size: 60px;
            padding-bottom: 0.3em;
          }

          grampsjs-note-content {
            --grampsjs-note-font-size: 23px;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      source: {type: Object},
      note: {type: Object},
    }
  }

  constructor() {
    super()
    this.source = {}
    this.note = {}
  }

  render() {
    if (Object.keys(this.source).length === 0) {
      return html``
    }
    return html`
      <div class="blog-preview">
        <h2>${this.source.title}</h2>
        ${this._isAuthor()
          ? html`<md-outlined-button
              @click=${() =>
                this.dispatchEvent(
                  new CustomEvent('nav', {
                    bubbles: true,
                    composed: true,
                    detail: {path: `new_blog_post/${this.source.gramps_id}`},
                  })
                )}
              >${this._('Edit')}</md-outlined-button
            >`
          : ''}
        <h3 class="author">
          <grampsjs-blog-author
            .source=${this.source}
            .appState=${this.appState}
          ></grampsjs-blog-author>
          ~
          ${this.appState.i18n.lang && blogPublicationTimestamp(this.source)
            ? html`<grampsjs-timedelta
                timestamp="${blogPublicationTimestamp(this.source)}"
                locale="${this.appState.i18n.lang}"
              ></grampsjs-timedelta>`
            : ''}
        </h3>
        <grampsjs-blog-cover
          .source=${this.source}
          .appState=${this.appState}
        ></grampsjs-blog-cover>
        <div id="note">
          <div id="note-wrapper">
            ${isMarkdownNote(this.note)
              ? html`<grampsjs-markdown
                  .appState=${this.appState}
                  .content=${this.note.text.string}
                ></grampsjs-markdown>`
              : html`<grampsjs-note-content
                  grampsId="${this.note.grampsId}"
                  content="${this.note?.formatted?.html ||
                  this.note?.text?.string ||
                  'Error loading note'}"
                >
                </grampsjs-note-content>`}
          </div>
        </div>
      </div>
    `
  }

  _isAuthor() {
    const userId = this.appState.auth?.claims?.sub
    return (
      !!userId &&
      this.appState.permissions.canEdit &&
      this.source.attribute_list?.some(
        attribute =>
          (attribute.type?.string || attribute.type) === 'Blog author' &&
          attribute.value === userId
      )
    )
  }
}

window.customElements.define('grampsjs-blog-post', GrampsjsBlogPost)
