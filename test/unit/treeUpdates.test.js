import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {TreeUpdatesController} from '../../src/treeUpdates.js'
import {apiTreeUpdates} from '../../src/api.js'

describe('pushed tree updates', () => {
  let controller
  let subscribe
  let onChange
  let onNotice
  let context
  let canRefresh
  let sessions
  const tick = ms => vi.advanceTimersByTimeAsync(ms)
  const send = (revision, {event = 'changed', own = false, ...details} = {}) =>
    sessions.at(-1).onEvent({event, data: {revision, own, ...details}})

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    context = 'user/tree'
    canRefresh = true
    sessions = []
    subscribe = vi.fn().mockImplementation(
      options =>
        new Promise(resolve => {
          sessions.push({...options, finish: resolve})
          options.signal.addEventListener('abort', resolve)
        })
    )
    onChange = vi.fn()
    onNotice = vi.fn()
    controller = new TreeUpdatesController(
      {addController() {}},
      {
        getContext: () => context,
        subscribe,
        canRefresh: () => canRefresh,
        onChange,
        onNotice,
      }
    )
    controller.hostConnected()
    send('1-0', {event: 'ready'})
  })

  afterEach(() => {
    controller.hostDisconnected()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('stays connected without polling and notifies two seconds before refreshing', async () => {
    await tick(600_000)
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
    send('2-0')
    expect(onNotice).toHaveBeenLastCalledWith('refreshing', expect.any(Object))
    await tick(1999)
    expect(onChange).not.toHaveBeenCalled()
    await tick(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onNotice).toHaveBeenLastCalledWith('')
  })

  it('does not notify about the current user’s own saves', async () => {
    send('2-0', {own: true})
    await tick(2000)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onNotice).not.toHaveBeenCalledWith('refreshing')
  })

  it('preserves the remote editor and summary when an own save arrives', () => {
    const details = {
      actor_name: 'Alex',
      changes: [{type: 'Source', action: 1, count: 1}],
    }
    send('2-0', details)
    send('3-0', {own: true})
    expect(onNotice).toHaveBeenLastCalledWith(
      'refreshing',
      expect.objectContaining(details)
    )
  })

  it('coalesces bursts and duplicate events into one refresh', async () => {
    send('2-0')
    send('3-0')
    await tick(2000)
    send('3-0')
    await tick(2000)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('notifies immediately during editing but waits to refresh', async () => {
    window.dispatchEvent(new Event('edit-mode:on'))
    send('2-0')
    expect(onNotice).toHaveBeenLastCalledWith('deferred', expect.any(Object))
    await tick(10_000)
    expect(onChange).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('edit-mode:off'))
    await tick(2000)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('cancels a scheduled refresh if the user begins editing', async () => {
    send('2-0')
    await tick(1000)
    window.dispatchEvent(new Event('edit-mode:on'))
    await tick(2000)
    expect(onChange).not.toHaveBeenCalled()
    expect(onNotice).toHaveBeenLastCalledWith('deferred', expect.any(Object))
  })

  it('defers changes while creating an object or saving', async () => {
    canRefresh = false
    send('2-0')
    await tick(2000)
    expect(onChange).not.toHaveBeenCalled()
    canRefresh = true
    controller.hostUpdated()
    await tick(2000)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('disconnects hidden tabs and catches up from the reconnect snapshot', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(sessions[0].signal.aborted).toBe(true)
    await tick(600_000)
    expect(subscribe).toHaveBeenCalledTimes(1)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(subscribe).toHaveBeenCalledTimes(2)
    send('5-0', {event: 'ready'})
    await tick(2000)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('backs off failed reconnects, with no concurrent connections', async () => {
    subscribe.mockRejectedValue(new Error('offline'))
    sessions[0].finish()
    await tick(1000)
    expect(subscribe).toHaveBeenCalledTimes(2)
    await tick(1999)
    expect(subscribe).toHaveBeenCalledTimes(2)
    await tick(1)
    expect(subscribe).toHaveBeenCalledTimes(3)
  })

  it('ignores old events and cancels notices after a tree switch or logout', async () => {
    send('2-0')
    const old = sessions[0]
    context = 'another/tree'
    controller.hostUpdated()
    expect(old.signal.aborted).toBe(true)
    old.onEvent({event: 'changed', data: {revision: 'old-tree'}})
    send('50-0', {event: 'ready'})
    await tick(2000)
    expect(onChange).not.toHaveBeenCalled()
    context = null
    controller.hostUpdated()
    await tick(60_000)
    expect(subscribe).toHaveBeenCalledTimes(2)
  })
})

describe('authenticated event stream transport', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('parses fragmented events and ignores heartbeat comments', async () => {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(
      ': keepalive\n\nevent: changed\ndata: {"revision":"2-0","own":false}\n\n'
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          start(stream) {
            for (const byte of bytes) stream.enqueue(new Uint8Array([byte]))
            stream.close()
          },
        }),
      })
    )
    const onEvent = vi.fn()
    const signal = new AbortController().signal
    await apiTreeUpdates(
      {getValidAccessToken: async () => 'secret-token'},
      {signal, onEvent}
    )
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tree/updates/'),
      {
        headers: {
          Authorization: 'Bearer secret-token',
          Accept: 'text/event-stream',
        },
        cache: 'no-store',
        signal,
      }
    )
    expect(onEvent).toHaveBeenCalledExactlyOnceWith({
      event: 'changed',
      data: {revision: '2-0', own: false},
    })
  })
})
