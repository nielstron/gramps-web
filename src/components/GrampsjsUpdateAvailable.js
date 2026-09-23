export class GrampsjsUpdateAvailable extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'}).innerHTML = '<slot></slot>'
    this._accepted = false
    this._refreshing = false
    this._connected = false
    this._click = event => {
      if (
        event
          .composedPath()
          .some(element => element.getAttribute?.('slot') === 'action')
      ) {
        this._postMessage(event)
      }
    }
    this._controllerChanged = () => {
      if (this._accepted && !this._refreshing) {
        this._refreshing = true
        window.location.reload()
      }
    }
    this._stateChanged = () => this._showInstalledUpdate()
    this._updateFound = () => {
      this._worker?.removeEventListener('statechange', this._stateChanged)
      this._worker = this._registration.installing
      this._worker?.addEventListener('statechange', this._stateChanged)
      this._stateChanged()
    }
  }

  _showInstalledUpdate() {
    if (
      this._worker?.state === 'installed' &&
      navigator.serviceWorker.controller
    ) {
      this.removeAttribute('hidden')
    }
  }

  async connectedCallback() {
    this._connected = true
    this.setAttribute('hidden', '')
    this.addEventListener('click', this._click)
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      this._controllerChanged
    )
    const registration = await navigator.serviceWorker.getRegistration()
    if (!this._connected || !registration) return
    this._registration = registration
    registration.addEventListener('updatefound', this._updateFound)
    this._updateFound()
    if (registration.waiting && navigator.serviceWorker.controller) {
      this.removeAttribute('hidden')
    }
  }

  disconnectedCallback() {
    this._connected = false
    this.removeEventListener('click', this._click)
    navigator.serviceWorker?.removeEventListener(
      'controllerchange',
      this._controllerChanged
    )
    this._registration?.removeEventListener('updatefound', this._updateFound)
    this._worker?.removeEventListener('statechange', this._stateChanged)
  }

  async _postMessage(event) {
    event.preventDefault()
    const registration = await navigator.serviceWorker.getRegistration()
    this._accepted = true
    if (registration?.waiting) {
      registration.waiting.postMessage({type: 'SKIP_WAITING'})
    } else {
      // Another tab may already have activated the update.
      this._controllerChanged()
    }
  }
}

window.customElements.define(
  'grampsjs-update-available',
  GrampsjsUpdateAvailable
)
