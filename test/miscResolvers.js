// import { last, length, groupBy, pipe, prop, sortBy, values } from 'ramda'
import chai, { expect } from 'chai'
import spies from 'chai-spies'

import { skip } from '../src/utils'
import { pipeResolvers } from '../src/pipeResolvers'
import { loggingResolver, contextMustBeObject, allResolvers } from '../src/miscResolvers'

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
      expect(contextMustBeObject()).to.be.an('error').and.have.property(
        'message', 'Some functionality requires context to be an object.'
      )
    })

    it('should return error when 3th argument (context) is not an object', () => {
      expect(contextMustBeObject(null, null, 2)).to.be.an('error').and.have.property(
        'message', 'Some functionality requires context to be an object.'
      )
    })

    it('should return skip when 3th argument (context) is an object of any kind', () => {
      expect(contextMustBeObject(null, null, {})).to.be.equal(skip)
      expect(contextMustBeObject(null, null, [])).to.be.equal(skip)
      expect(contextMustBeObject(null, null, () => {})).to.be.equal(skip)
      // eslint-disable-next-line no-new-wrappers
      expect(contextMustBeObject(null, null, new String('string object'))).to.be.equal(skip)
    })
  })

  describe.only('allResolvers', () => {
    const stringResolver = () => 'string'
    const numberResolver = () => 2
    const pipedResolver = pipeResolvers(stringResolver, numberResolver)

    it('should resolve to an empty array when resolvers array is empty', () =>
      expect(allResolvers([])()).to.eventually.deep.equal([])
    )

    it('should resolve a single resolver', () =>
      expect(allResolvers([stringResolver])()).to.eventually.deep.equal(['string'])
    )

    it('should resolve multiple resolvers', () =>
      expect(allResolvers([stringResolver, numberResolver])())
        .to.eventually.deep.equal(['string', 2])
    )

    it('should resolve composed resolvers', () =>
      expect(allResolvers([stringResolver, numberResolver, pipedResolver])())
        .to.eventually.deep.equal(['string', 2, 2])
    )

    it('should throw when no argument is provided', () =>
      expect(() => allResolvers()()).to.throw
    )
  })
})
