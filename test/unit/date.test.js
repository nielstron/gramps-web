import {describe, it, expect} from 'vitest'
import {formatDateString, formatDateValue, toDate} from '../../src/date.js'

describe('localized dates', () => {
  it('formats ISO dates in the requested browser locale', () => {
    expect(formatDateString('1985-06-15', 'en-US')).to.equal('6/15/1985')
    expect(formatDateString('1985-06-15', 'de-CH')).to.equal('15.6.1985')
  })

  it('formats dates before the year 1000 in the requested locale', () => {
    expect(formatDateString('929-09-05', 'de-DE')).to.equal('5.9.929')
  })

  it('localizes ISO dates inside qualified and ranged date strings', () => {
    expect(formatDateString('about 1985-06-15 – 1986-07-20', 'en-US')).to.equal(
      'about 6/15/1985 – 7/20/1986'
    )
  })

  it('localizes month-precision ISO dates', () => {
    expect(formatDateString('1972-05', 'en-US')).to.equal('5/1972')
    expect(formatDateString('1972-05', 'de-CH')).to.equal('5.1972')
  })

  it('preserves year-only dates and non-ISO text dates', () => {
    expect(formatDateString('1985', 'de-CH')).to.equal('1985')
    expect(formatDateString('late spring', 'de-CH')).to.equal('late spring')
  })

  it('formats Gramps date values with matching precision', () => {
    expect(formatDateValue([15, 6, 1985], 'en-US')).to.equal('6/15/1985')
    expect(formatDateValue([0, 6, 1985], 'en-US')).to.equal('6/1985')
    expect(formatDateValue([0, 0, 1985], 'en-US')).to.equal('1985')
  })
})

describe('toDate', () => {
  it('formats a normal date', () => {
    expect(toDate([15, 6, 1985])).to.equal('1985-6-15')
  })

  it('formats day/month zero (year only)', () => {
    expect(toDate([0, 0, 1900])).to.equal('1900-0-0')
  })

  it('returns empty string for undefined', () => {
    expect(toDate(undefined)).to.equal('')
  })

  it('returns empty string for null', () => {
    expect(toDate(null)).to.equal('')
  })

  it('returns empty string for empty array', () => {
    expect(toDate([])).to.equal('undefined-undefined-undefined')
  })
})
