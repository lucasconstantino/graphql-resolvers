import { skip, nextTick } from '../src/utils'

describe('utils', () => {
  describe('skip', () => {
    it('should equal undefined', () => {
      expect(skip).toEqual(undefined)
    })
  })

  describe('nextTick', () => {
    it('should return a promised version of a value', async () => {
      const value = await nextTick(1)
      expect(value).toEqual(1)
    })
  })
})
