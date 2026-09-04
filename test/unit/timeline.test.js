import {render} from 'lit'
import {describe, it, expect, vi} from 'vitest'
import {GrampsjsTimeline} from '../../src/components/GrampsjsTimeline.js'
import {
  Timeline,
  normalizeLocale,
  initialDomain,
  tickLabel,
} from '../../src/charts/Timeline.js'

describe('normalizeLocale', () => {
  it('converts underscore to hyphen', () => {
    expect(normalizeLocale('de_AT')).toBe('de-AT')
    expect(normalizeLocale('pt_PT')).toBe('pt-PT')
    expect(normalizeLocale('en_GB')).toBe('en-GB')
  })

  it('leaves already-valid locales unchanged', () => {
    expect(normalizeLocale('en')).toBe('en')
    expect(normalizeLocale('fr')).toBe('fr')
  })

  it('falls back to en for falsy values', () => {
    expect(normalizeLocale('')).toBe('en')
    expect(normalizeLocale(null)).toBe('en')
    expect(normalizeLocale(undefined)).toBe('en')
  })
})

describe('initialDomain', () => {
  it('starts on Jan 1st exactly 100 years before now', () => {
    const now = new Date('2026-05-18')
    const [start] = initialDomain(now)
    expect(start.getFullYear()).toBe(1926)
    expect(start.getMonth()).toBe(0)
    expect(start.getDate()).toBe(1)
  })

  it('ends at the supplied date', () => {
    const now = new Date('2026-05-18')
    const [, end] = initialDomain(now)
    expect(end).toBe(now)
  })

  it('works across century boundaries', () => {
    const now = new Date('2000-01-01')
    const [start] = initialDomain(now)
    expect(start.getFullYear()).toBe(1900)
  })
})

describe('visible domain', () => {
  it('survives the first event batch arriving asynchronously', async () => {
    const domain = [new Date(1900, 0, 1), new Date(2030, 11, 31)]
    const chart = Timeline([], {width: 800, height: 300, visibleDomain: domain})

    chart.updateEvents([
      {
        handle: 'e1',
        jsDate: new Date(1995, 0, 27),
        eventType: 'Birth',
        modifier: 0,
      },
    ])
    await new Promise(resolve => requestAnimationFrame(resolve))

    const restored = chart.getDomain()
    expect(Math.abs(restored[0] - domain[0])).toBeLessThanOrEqual(1)
    expect(Math.abs(restored[1] - domain[1])).toBeLessThanOrEqual(1)
  })

  it('updates its domain when the zoom control is used', async () => {
    const domain = [new Date(1900, 0, 1), new Date(2030, 11, 31)]
    const chart = Timeline([], {
      width: 800,
      height: 300,
      visibleDomain: domain,
    })
    chart.updateEvents([
      {
        handle: 'e1',
        jsDate: new Date(1995, 0, 27),
        eventType: 'Birth',
        modifier: 0,
      },
    ])
    await new Promise(resolve => requestAnimationFrame(resolve))
    const before = chart.getDomain()

    chart.zoomIn()
    await new Promise(resolve => setTimeout(resolve, 400))

    const after = chart.getDomain()
    expect(after[1] - after[0]).toBeLessThan(before[1] - before[0])
  })
})

describe('timeline controls', () => {
  it('calls the chart zoom action from the zoom-in button', () => {
    const timeline = new GrampsjsTimeline()
    timeline.appState = {i18n: {strings: {}}}
    timeline._width = 800
    timeline._height = 300
    timeline._chart = {node: document.createElement('svg'), zoomIn: vi.fn()}
    const container = document.createElement('div')
    render(timeline.render(), container)

    container.querySelector('#btn-zoom-in').click()

    expect(timeline._chart.zoomIn).toHaveBeenCalledOnce()
  })
})

describe('tickLabel', () => {
  const fmtDay = {format: () => 'day'}
  const fmtMonth = {format: () => 'month'}
  const fmtYear = {format: () => 'year'}
  const formatters = {fmtDay, fmtMonth, fmtYear}

  it('uses year format for Jan 1', () => {
    expect(tickLabel(new Date(2020, 0, 1), formatters)).toBe('year')
    expect(tickLabel(new Date(1066, 0, 1), formatters)).toBe('year')
  })

  it('uses month format for the 1st of any non-January month', () => {
    expect(tickLabel(new Date(2020, 5, 1), formatters)).toBe('month')
    expect(tickLabel(new Date(2020, 11, 1), formatters)).toBe('month')
  })

  it('uses day format for any non-1st day', () => {
    expect(tickLabel(new Date(2020, 5, 15), formatters)).toBe('day')
    expect(tickLabel(new Date(2020, 0, 15), formatters)).toBe('day')
  })
})
