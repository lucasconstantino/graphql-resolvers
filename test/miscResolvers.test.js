// import { last, length, groupBy, pipe, prop, sortBy, values } from 'ramda'
import { skip } from '../src/utils'
import { loggingResolver, contextMustBeObject } from '../src/miscResolvers'

describe('miscResolvers', () => {
  describe('loggingResolver', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      console.log.mockRestore()
    })

    it('should log any passed arguments', () => {
      loggingResolver('foo', 'bar', 'baz')

      expect(console.log).toHaveBeenCalledTimes(1)
      expect(console.log).toHaveBeenCalledWith(
        ['foo', 'bar', 'baz'],
        expect.anything()
      )
    })

    it('should return a skip', () => {
      expect(loggingResolver()).toEqual(skip)
    })
  })

  describe('contextMustBeObject', () => {
    it('should return error when no arguments is suplied', () => {
      expect(contextMustBeObject())
        .toBeInstanceOf(Error)
        .toHaveProperty(
          'message',
          'Some functionality requires context to be an object.'
        )
    })

    it('should return error when 3th argument (context) is not an object', () => {
      expect(contextMustBeObject(null, null, 2))
        .toBeInstanceOf(Error)
        .toHaveProperty(
          'message',
          'Some functionality requires context to be an object.'
        )
    })

    it('should return skip when 3th argument (context) is an object of any kind', () => {
      // eslint-disable-next-line no-new-wrappers
      const stringObject = new String('string object')
      expect(contextMustBeObject(null, null, {})).toEqual(skip)
      expect(contextMustBeObject(null, null, [])).toEqual(skip)
      expect(contextMustBeObject(null, null, () => {})).toEqual(skip)
      expect(contextMustBeObject(null, null, stringObject)).toEqual(skip)
    })
  })
})
