// import { last, length, groupBy, pipe, prop, sortBy, values } from 'ramda'
import chai, { expect } from 'chai'
import spies from 'chai-spies'

import { allResolvers } from '../src/allResolvers'
import { pipeResolvers } from '../src/pipeResolvers'

// Apply chai extensions.
chai.use(spies)

describe('allResolvers', () => {
  const stringResolver = chai.spy(() => 'string')
  const numberResolver = chai.spy(() => 2)
  const pipedResolver = chai.spy(pipeResolvers(stringResolver, numberResolver))

  beforeEach(() => stringResolver.reset())
  beforeEach(() => numberResolver.reset())
  beforeEach(() => pipedResolver.reset())

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

  it('should pass any argument to the resolvers', async () => {
    await allResolvers([stringResolver, numberResolver])(1, 2, 3, 4, 5)
    expect(stringResolver).to.have.been.called.once.with.exactly(1, 2, 3, 4, 5)
    expect(numberResolver).to.have.been.called.once.with.exactly(1, 2, 3, 4, 5)
  })
})
