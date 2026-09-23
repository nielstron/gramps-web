const RETRY_DELAY = 1000
const MAX_RETRY_DELAY = 60_000
const NOTICE_DELAY = 2000

// One authenticated SSE connection per visible app, shared by all its views.
export class TreeUpdatesController {
  constructor(host, {getContext, subscribe, canRefresh, onNotice, onChange}) {
    host.addController(this)
    this.getContext = getContext
    this.subscribe = subscribe
    this.canRefresh = canRefresh
    this.onNotice = onNotice
    this.onChange = onChange
    this._context = null
    this._connected = false
    this._editing = false
    this._pending = false
    this._notify = false
    this._revision = undefined
    this._notice = {}
    this._retryDelay = RETRY_DELAY
    this._resume = () => {
      if (this._canConnect()) this._connect()
      else this._disconnect()
    }
    this._editOn = () => {
      this._editing = true
      this._flush()
    }
    this._editOff = () => {
      this._editing = false
      queueMicrotask(() => this._flush())
    }
  }

  hostConnected() {
    this._connected = true
    document.addEventListener('visibilitychange', this._resume)
    window.addEventListener('online', this._resume)
    window.addEventListener('offline', this._resume)
    window.addEventListener('edit-mode:on', this._editOn)
    window.addEventListener('edit-mode:off', this._editOff)
    this.hostUpdated()
  }

  hostDisconnected() {
    this._connected = false
    this._reset()
    this._context = null
    document.removeEventListener('visibilitychange', this._resume)
    window.removeEventListener('online', this._resume)
    window.removeEventListener('offline', this._resume)
    window.removeEventListener('edit-mode:on', this._editOn)
    window.removeEventListener('edit-mode:off', this._editOff)
  }

  hostUpdated() {
    if (!this._connected) return
    const context = this.getContext()
    if (context !== this._context) {
      this._reset()
      this._context = context
      this._connect()
    }
    this._flush()
  }

  _disconnect() {
    clearTimeout(this._retryTimer)
    clearTimeout(this._refreshTimer)
    this._refreshTimer = null
    this._request?.abort()
    this._request = null
  }

  _reset() {
    this._disconnect()
    this._editing = false
    this._revision = undefined
    this._notice = {}
    this._pending = false
    this._notify = false
    this._retryDelay = RETRY_DELAY
    this.onNotice('')
  }

  _canConnect() {
    return (
      this._connected &&
      this._context &&
      this.getContext() === this._context &&
      document.visibilityState !== 'hidden' &&
      navigator.onLine !== false
    )
  }

  _flush() {
    if (!this._pending || !this._canConnect()) return
    if (this._editing || !this.canRefresh()) {
      clearTimeout(this._refreshTimer)
      this._refreshTimer = null
      if (this._notify) this.onNotice('deferred', this._notice)
      return
    }
    if (!this._notify) {
      this._pending = false
      this.onChange()
      return
    }
    this.onNotice('refreshing', this._notice)
    if (this._refreshTimer) return
    this._refreshTimer = setTimeout(() => {
      this._refreshTimer = null
      if (!this._canConnect() || this._editing || !this.canRefresh()) return
      this._pending = false
      this._notify = false
      this.onNotice('')
      this.onChange()
    }, NOTICE_DELAY)
  }

  async _connect() {
    if (!this._canConnect() || this._request) return
    clearTimeout(this._retryTimer)
    const request = new AbortController()
    this._request = request
    try {
      await this.subscribe({
        signal: request.signal,
        onEvent: ({event, data}) => {
          if (this._request !== request || this.getContext() !== this._context)
            return
          this._retryDelay = RETRY_DELAY
          const {revision, own} = data
          // First connection establishes a baseline. A reconnect snapshot also
          // detects missed changes, including changes beyond retained history.
          if (
            revision !== this._revision &&
            (event === 'changed' || this._revision !== undefined)
          ) {
            this._pending = true
            this._notify ||= !own
            if (!own) this._notice = data
          }
          this._revision = revision
          this._flush()
        },
      })
    } catch {
      // Keep the loaded page usable; reconnect after transient network failures.
    } finally {
      if (this._request === request) {
        this._request = null
        if (this._canConnect()) {
          this._retryTimer = setTimeout(() => this._connect(), this._retryDelay)
          this._retryDelay = Math.min(this._retryDelay * 2, MAX_RETRY_DELAY)
        }
      }
    }
  }
}
