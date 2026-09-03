import {describe, expect, it} from 'vitest'

import de from '../../lang/de.json'
import deAT from '../../lang/de_AT.json'

describe('birth-name label translations', () => {
  it('uses the conventional German abbreviation', () => {
    expect(de.born).toBe('geb.')
    expect(deAT.born).toBe('geb.')
  })
})
