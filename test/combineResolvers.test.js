/* eslint-disable brace-style */
import chai, { expect } from 'chai'
import promise from 'chai-as-promised'

import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'

import { skip } from '../src/utils'
import { combineResolvers } from '../src/combineResolvers'

import { resolvers, promiseResolvers, spyResolvers, clearSpyResolvers } from './helpers'

// Apply chai extensions.
chai.use(promise)

describe('combineResolvers', () => {
  beforeEach(clearSpyResolvers)

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
      return expect(combineResolvers(resolvers.error)())
        .to.eventually.be.an('error')
        .and.have.property('message', 'some returned error')
    })

    it('should reject with thrown errors', () => {
      return expect(combineResolvers(resolvers.thrownError)())
        .to.be.rejectedWith('some throw error')
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
      expect(spyResolvers.other).not.to.have.been.called.once
    })
  })

  describe('multiple resolvers', () => {
    it('should only execute resolvers until a value is resolved', async () => {
      await combineResolvers(spyResolvers.empty, spyResolvers.string, spyResolvers.other)()
      expect(spyResolvers.empty).to.have.been.called.once
      expect(spyResolvers.string).to.have.been.called.once
      expect(spyResolvers.other).not.to.have.been.called.once
    })

    it('should only execute resolvers until a value is resolved', async () => {
      await combineResolvers(spyResolvers.empty, spyResolvers.error, spyResolvers.string)()
      expect(spyResolvers.empty).to.have.been.called.once
      expect(spyResolvers.error).to.have.been.called.once
      expect(spyResolvers.string).not.to.have.been.called.once
    })
  })

  describe('promises', () => {
    it('should return single promised resolver value', () => {
      return expect(combineResolvers(promiseResolvers.string)()).to.eventually.equal('string')
    })

    it('should return errors when throwing inside resolvers', () => {
      return expect(combineResolvers(promiseResolvers.error)())
        .to.eventually.be.an('error')
        .and.have.property('message', 'some returned error')
    })
  })

  describe('real world', () => {
    /**
     * Sample resolver which returns an error in case no user
     * is available in the provided context.
     */
    const isAuthenticated = (root, args, { user }) => user ? skip : new Error('Not authenticated')

    /**
     * Sample resolver which returns an error in case user
     * is not admin.
     */
    const isAdmin = combineResolvers(
      isAuthenticated,
      (root, args, { user: { role } }) => role === 'admin' ? skip : new Error('Not admin')
    )

    /**
     * Sample factory resolver which returns error if user is
     * aged below allowed age.
     */
    const isNotUnderage = (minimumAge = 18) => combineResolvers(
      isAuthenticated,
      (root, args, { user: { age } }) => age < minimumAge
        ? new Error(`User is underage ${minimumAge}`)
        : skip
    )

    /**
     * Sample hello world resolver for a logged user.
     */
    const hello = combineResolvers(
      isAuthenticated,
      (root, args, { user: { name } }) => `Hello, ${name}`
    )

    /**
     * Sample sensitive information resolver, for admins only.
     */
    const sensitive = combineResolvers(isAdmin, () => 'shhhh!')

    /**
     * Sample invalid option resolver for the voting system.
     */
    const isValidOption = (root, { choice }) => ['A', 'B', 'C'].indexOf(choice) > -1
      ? skip
      : new Error(`Option "${choice}" is invalid`)

    /**
     * Sample vote mutation.
     */
    const vote = combineResolvers(
      isNotUnderage(16),
      isValidOption,
      (root, { choice }) => {
        // Vote logic
        return true
      }
    )

    describe('functional', () => {
      describe('hello', () => {
        it('should return error when no user is logged in', () => {
          return expect(hello(null, null, {}))
            .to.eventually.be.an('error')
            .and.have.property('message', 'Not authenticated')
        })

        it('should return resolved value when user is logged in', () => {
          return expect(hello(null, null, { user: { name: 'John Doe' } })).to.eventually.equal('Hello, John Doe')
        })
      })

      describe('sensitive', () => {
        it('should return error when no user is logged in', () => {
          return expect(sensitive(null, null, {}))
            .to.eventually.be.an('error')
            .and.have.property('message', 'Not authenticated')
        })

        it('should return error when no user is logged in', () => {
          return expect(sensitive(null, null, { user: {} }))
            .to.eventually.be.an('error')
            .and.have.property('message', 'Not admin')
        })

        it('should return resolved value when user is admin', () => {
          return expect(sensitive(null, null, { user: { role: 'admin' } })).to.eventually.equal('shhhh!')
        })
      })

      describe('vote', () => {
        it('should return error when no user is logged in', () => {
          return expect(vote(null, { choice: 'A' }, {}))
            .to.eventually.be.an('error')
            .and.have.property('message', 'Not authenticated')
        })

        it('should return error when user is underage', () => {
          return expect(vote(null, { choice: 'B' }, { user: { age: 10 } }))
            .to.eventually.be.an('error')
            .and.have.property('message', 'User is underage 16')
        })

        it('should return error when options is invalid', () => {
          return expect(vote(null, { choice: 'Z' }, { user: { age: 18 } }))
            .to.eventually.be.an('error')
            .and.have.property('message', 'Option "Z" is invalid')
        })

        it('should return true when vote is registered', () => {
          return expect(vote(null, { choice: 'C' }, { user: { age: 18 } })).to.eventually.be.true
        })
      })
    })

    describe('GraphQL instance', () => {
      const typeDefs = `
        type Query {
          hello: String!
          sensitive: String!
        }

        type Mutation {
          vote(choice: String!): Boolean
        }

        schema {
          query: Query
          mutation: Mutation
        }
      `

      const resolvers = {
        Query: { hello, sensitive },
        Mutation: { vote }
      }

      const schema = makeExecutableSchema({ typeDefs, resolvers })

      describe('hello', () => {
        it('should return error when no user is logged in', () => {
          return expect(graphql(schema, '{ hello }', null, {}))
            .to.eventually.have.deep.property('errors.0.message').equal('Not authenticated')
        })

        it('should return resolved value when user is logged in', () => {
          return expect(graphql(schema, '{ hello }', null, { user: { name: 'John Doe' } }))
            .to.eventually.have.deep.property('data.hello').equal('Hello, John Doe')
        })
      })

      describe('sensitive', () => {
        it('should return error when no user is logged in', () => {
          return expect(graphql(schema, '{ sensitive }', null, {}))
            .to.eventually.have.deep.property('errors.0.message').equal('Not authenticated')
        })

        it('should return error when no user is logged in', () => {
          return expect(graphql(schema, '{ sensitive }', null, { user: {} }))
            .to.eventually.have.deep.property('errors.0.message').equal('Not admin')
        })

        it('should return resolved value when user is admin', () => {
          return expect(graphql(schema, '{ sensitive }', null, { user: { role: 'admin' } }))
            .to.eventually.have.deep.property('data.sensitive').equal('shhhh!')
        })
      })

      describe('vote', () => {
        it('should return error when no user is logged in', () => {
          return expect(graphql(schema, 'mutation { vote(choice: "A") }', null, {}))
            .to.eventually.have.deep.property('errors.0.message').equal('Not authenticated')
        })

        it('should return error when user is underage', () => {
          return expect(graphql(schema, 'mutation { vote(choice: "B") }', null, { user: { age: 10 } }))
            .to.eventually.have.deep.property('errors.0.message').equal('User is underage 16')
        })

        it('should return error when options is invalid', () => {
          return expect(graphql(schema, 'mutation { vote(choice: "Z") }', null, { user: { age: 18 } }))
            .to.eventually.have.deep.property('errors.0.message').equal('Option "Z" is invalid')
        })

        it('should return true when vote is registered', () => {
          return expect(graphql(schema, 'mutation { vote(choice: "C") }', null, { user: { age: 18 } }))
            .to.eventually.have.deep.property('data.vote').true
        })
      })
    })
  })
})
