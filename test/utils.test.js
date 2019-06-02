import { expect } from 'chai'
import { skip, nextTick } from '../src/utils'

const nil = () => {}

describe('utils', () => {
  describe('skip', () => {
    it('should equal undefined', () => {
      expect(skip).to.equal(undefined)
    })
  })

  describe('nextTick', () => {
    it('should return a promised version of a value', async () => {
      const value = await nextTick(1)
      expect(value).to.equal(1)
    })
  })
})
