import {html, css, LitElement} from 'lit'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {blogCoverHandle} from '../blogCover.js'
import './GrampsjsImg.js'

export class GrampsjsBlogCover extends GrampsjsAppStateMixin(LitElement) {
  static get properties() {
    return {
      source: {type: Object},
    }
  }

  static get styles() {
    return css`
      :host {
        display: block;
        margin: 24px 0;
      }
      grampsjs-img {
        display: flex;
        justify-content: center;
      }
    `
  }

  constructor() {
    super()
    this.source = {}
  }

  render() {
    const handle = blogCoverHandle(this.source)
    return html`${handle
      ? html`<grampsjs-img handle=${handle} size="1000"></grampsjs-img>`
      : ''} `
  }
}
window.customElements.define('grampsjs-blog-cover', GrampsjsBlogCover)
