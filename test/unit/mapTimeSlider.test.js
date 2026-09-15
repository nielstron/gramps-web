import {describe, it, expect} from 'vitest'
import '../../src/components/GrampsjsMapTimeSlider.js'

describe('map year and span controls', () => {
  it('renders a single year slider and a 1000-year span option', () => {
    const el = document.createElement('grampsjs-map-time-slider')
    el._ = key => key
    const template = el.render()
    expect(template.strings.join('')).not.toContain('?range=')
    expect(JSON.stringify(template.values)).toContain('1000')
  })

  it('keeps the selected year when choosing a large span near the bounds', () => {
    const el = document.createElement('grampsjs-map-time-slider')
    el.value = 1900
    el.span = 100
    let detail
    el.addEventListener('timeslider:change', event => {
      detail = event.detail
    })
    el._handleSpanYearsClick(1000)
    expect(detail).toEqual({
      value: 1900,
      span: 1000,
      yearStart: 900,
      yearEnd: 2900,
    })
  })

  it('moves the year without changing the span', () => {
    const el = document.createElement('grampsjs-map-time-slider')
    el.span = 1000
    el.renderRoot = {querySelector: () => ({value: 1750})}
    el._handleInput()
    expect(el.value).toBe(1750)
    expect(el.span).toBe(1000)
  })
})
