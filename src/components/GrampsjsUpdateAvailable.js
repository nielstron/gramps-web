export class GrampsjsUpdateAvailable extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'}).innerHTML = '<slot></slot>'
    this._accepted = false
    this._refreshing = false
    this._connected = false
    this._check = 0
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
      } else if (!this._accepted) {
        this._checkWorker(navigator.serviceWorker.controller)
      }
    }
    this._stateChanged = () => this._showInstalledUpdate()
    this._updateFound = () => {
      this._worker?.removeEventListener('statechange', this._stateChanged)
      this._worker = this._registration.installing
      this._worker?.addEventListener('statechange', this._stateChanged)
      return this._stateChanged()
    }
  }

  _showInstalledUpdate() {
    const worker =
      this._registration?.waiting ||
      (this._worker?.state === 'installed' ? this._worker : null)
    if (worker && navigator.serviceWorker.controller) {
      return this._checkWorker(worker)
    }
  }

  _getWorkerBuild(worker) {
    return new Promise(resolve => {
      const channel = new MessageChannel()
      const finish = build => {
        clearTimeout(timeout)
        channel.port1.close()
        channel.port2.close()
        resolve(build)
      }
      // Older releases do not understand this message. Keep their manual update action.
      const timeout = setTimeout(() => finish(undefined), 1500)
      channel.port1.onmessage = event => finish(event.data)
      worker.postMessage({type: 'GET_BUILD_ID'}, [channel.port2])
    })
  }

  async _checkWorker(worker) {
    if (!worker) return
    const check = ++this._check
    const currentBuild = globalThis.GRAMPSWEB_BUILD_ID
    const workerBuild = currentBuild
      ? await this._getWorkerBuild(worker)
      : undefined
    if (!this._connected || check !== this._check) return
    if (currentBuild && workerBuild === currentBuild) {
      this.setAttribute('hidden', '')
      // A normal browser reload already fetched this build's page. Finish the
      // matching worker update silently; no tab is forced to reload.
      if (this._registration?.waiting === worker) {
        worker.postMessage({type: 'SKIP_WAITING'})
      }
    } else {
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
    await this._updateFound()
  }

  disconnectedCallback() {
    this._connected = false
    this._check += 1
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
