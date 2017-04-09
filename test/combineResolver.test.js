/* eslint-disable brace-style */
import chai, { expect } from 'chai'
import promise from 'chai-as-promised'
import spies from 'chai-spies'
import { skip, combineResolvers } from '../src/combineResolvers'

chai.use(promise).use(spies)

describe('combineResolvers', () => {
  const resolvers = {
    skip: () => skip,
    empty: () => {},
    string: () => 'string',
    other: () => 'other',
    error: () => new Error('some returned error'),
    thrownError: () => { throw new Error('some throw error') },
  }

  // Wrap every resolver in promise resolvers for tests.
  const promiseResolvers = Object.keys(resolvers)
    .reduce((result, key) => Object.assign(result, {
      [key]: async (...args) => resolvers[key](...args)
    }), {})

  // Wrap every resolver in spies for tests.
  const spyResolvers = Object.keys(resolvers)
    .reduce((result, key) => Object.assign(result, {
      [key]: chai.spy(resolvers[key])
    }), {})

  // Clear spies before each test.
  beforeEach(() => Object.keys(spyResolvers).forEach(key => spyResolvers[key].reset()))

  describe('single resolver', () => {
    it('should return a function once combined', () => {
      expect(typeof combineResolvers()).to.equal('function')
      expect(typeof combineResolvers(() => {})).to.equal('function')
      expect(typeof combineResolvers(() => {}, () => {})).to.equal('function')
    })

    it('should return undefined when empty resolver', () => {
      return expect(combineResolvers()()).to.eventually.be.undefined
    })

    it('should return undefined on skiped resolvers', () => {
      return expect(combineResolvers(resolvers.skip)()).to.eventually.be.undefined
    })

    it('should return single resolver value', () => {
      return expect(combineResolvers(resolvers.string)()).to.eventually.equal('string')
    })

    it('should return resolved errors', () => {
      return expect(combineResolvers(resolvers.error)()).to.eventually.be.an('error')
    })

    it('should return thrown errors as normal values', () => {
      return expect(combineResolvers(resolvers.thrownError)()).to.eventually.be.rejectedWith('some throw error')
    })

    it('should call resolver with all arguments received', async () => {
      await combineResolvers(spyResolvers.empty)('foo')
      expect(spyResolvers.empty).to.have.been.called.with('foo')

      await combineResolvers(spyResolvers.empty)('foo', 'bar', 'baz')
      expect(spyResolvers.empty).to.have.been.called.with('foo', 'bar', 'baz')
    })
  })

  describe('two resolvers', () => {
    it('should resolve only first value', async () => {
      await expect(combineResolvers(resolvers.string, resolvers.other)()).to.eventually.equal('string')
      await expect(combineResolvers(resolvers.string, resolvers.other)()).not.to.eventually.equal('other')
    })

    it('should only execute resolvers until a value is resolved', async () => {
      await combineResolvers(spyResolvers.string, spyResolvers.other)()
      expect(spyResolvers.string).to.have.been.called.once
      expect(spyResolvers.other).not.to.have.been.called
    })
  })

  describe('multiple resolvers', () => {
    it('should only execute resolvers until a value is resolved', async () => {
      await combineResolvers(spyResolvers.empty, spyResolvers.string, spyResolvers.other)()
      expect(spyResolvers.empty).to.have.been.called.once
      expect(spyResolvers.string).to.have.been.called.once
      expect(spyResolvers.other).not.to.have.been.called
    })

    it('should only execute resolvers until a value is resolved', async () => {
      await combineResolvers(spyResolvers.empty, spyResolvers.error, spyResolvers.string)()
      expect(spyResolvers.empty).to.have.been.called.once
      expect(spyResolvers.error).to.have.been.called.once
      expect(spyResolvers.string).not.to.have.been.called
    })
  })

  describe('promises', () => {
    it('should return single promised resolver value', () => {
      return expect(combineResolvers(promiseResolvers.string)()).to.eventually.equal('string')
    })

    it('should return errors when throwing inside resolvers', () => {
      return expect(combineResolvers(promiseResolvers.error)()).to.eventually.be.an('error')
    })
  })
})
