// import { last, length, groupBy, pipe, prop, sortBy, values } from 'ramda'
import chai, { expect } from 'chai'
import spies from 'chai-spies'

import { skip } from '../src/utils'
import { loggingResolver, contextMustBeObject } from '../src/miscResolvers'

// Apply chai extensions.
chai.use(spies)

describe('miscResolvers', () => {
  describe('loggingResolver', () => {
    const backup = console.log

    beforeEach(() => {
      console.log = chai.spy()
    })

    afterEach(() => {
      console.log.reset()
      console.log = backup
    })

    it('should log any passed arguments', () => {
      loggingResolver('foo', 'bar', 'baz')
      expect(console.log).to.have.been.called.once.with(['foo', 'bar', 'baz'])
    })

    it('should return a skip', () => {
      expect(loggingResolver()).to.equal(skip)
    })
  })

  describe('contextMustBeObject', () => {
    it('should return error when no arguments is suplied', () => {
      expect(contextMustBeObject())
        .to.be.an('error')
        .and.have.property(
          'message',
          'Some functionality requires context to be an object.'
        )
    })

    it('should return error when 3th argument (context) is not an object', () => {
      expect(contextMustBeObject(null, null, 2))
        .to.be.an('error')
        .and.have.property(
          'message',
          'Some functionality requires context to be an object.'
        )
    })

    it('should return skip when 3th argument (context) is an object of any kind', () => {
      expect(contextMustBeObject(null, null, {})).to.be.equal(skip)
      expect(contextMustBeObject(null, null, [])).to.be.equal(skip)
      expect(contextMustBeObject(null, null, () => {})).to.be.equal(skip)
      // eslint-disable-next-line no-new-wrappers
      expect(
        contextMustBeObject(null, null, new String('string object'))
      ).to.be.equal(skip)
    })
  })
})
