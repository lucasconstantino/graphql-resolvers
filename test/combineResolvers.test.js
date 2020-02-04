/* eslint-disable brace-style */
import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'

import { skip } from '../src/utils'
import { combineResolvers } from '../src/combineResolvers'

import {
  resolvers as utilResolvers,
  promiseResolvers,
  spyResolvers,
} from './helpers'

describe('combineResolvers', () => {
  beforeEach(jest.clearAllMocks)

  describe('single resolver', () => {
    it('should return a function once combined', () => {
      expect(typeof combineResolvers()).toBe('function')
      expect(typeof combineResolvers(() => {})).toBe('function')
      expect(
        typeof combineResolvers(
          () => {},
          () => {}
        )
      ).toBe('function')
    })

    it('should return undefined when empty resolver', () => {
      expect(combineResolvers()()).resolves.toBeUndefined()
    })

    it('should return undefined on skiped resolvers', () => {
      expect(combineResolvers(utilResolvers.skip)()).resolves.toBeUndefined()
    })

    it('should return single resolver value', () => {
      expect(combineResolvers(utilResolvers.string)()).resolves.toBe('string')
    })

    it('should return resolved errors', () => {
      expect(combineResolvers(utilResolvers.error)())
        .resolves.toBeInstanceOf(Error)
        .resolves.toHaveProperty('message', 'some returned error')
    })

    it('should reject with thrown errors', () => {
      expect(combineResolvers(utilResolvers.thrownError)()).rejects.toThrow(
        'some throw error'
      )
    })

    it('should call resolver with all arguments received', async () => {
      await combineResolvers(spyResolvers.empty)('foo')
      expect(spyResolvers.empty).toHaveBeenCalledWith('foo')

      await combineResolvers(spyResolvers.empty)('foo', 'bar', 'baz')
      expect(spyResolvers.empty).toHaveBeenCalledWith('foo', 'bar', 'baz')
    })
  })

  describe('two resolvers', () => {
    it('should resolve only first value', () => {
      const resolver = combineResolvers(
        utilResolvers.string,
        utilResolvers.other
      )
      expect(resolver()).resolves.toBe('string')
      expect(resolver()).resolves.not.toBe('other')
    })

    it('should only execute resolvers until a value is resolved', async () => {
      await combineResolvers(spyResolvers.string, spyResolvers.other)()
      expect(spyResolvers.string).toHaveBeenCalledTimes(1)
      expect(spyResolvers.other).not.toHaveBeenCalled()
    })
  })

  describe('multiple resolvers', () => {
    it('should only execute resolvers until a value is resolved', async () => {
      await combineResolvers(
        spyResolvers.empty,
        spyResolvers.string,
        spyResolvers.other
      )()

      expect(spyResolvers.empty).toHaveBeenCalledTimes(1)
      expect(spyResolvers.string).toHaveBeenCalledTimes(1)
      expect(spyResolvers.other).not.toHaveBeenCalled()
    })

    it('should only execute resolvers until a value is resolved', async () => {
      await combineResolvers(
        spyResolvers.empty,
        spyResolvers.error,
        spyResolvers.string
      )()

      expect(spyResolvers.empty).toHaveBeenCalledTimes(1)
      expect(spyResolvers.error).toHaveBeenCalledTimes(1)
      expect(spyResolvers.string).not.toHaveBeenCalled()
    })
  })

  describe('promises', () => {
    it('should return single promised resolver value', () => {
      expect(combineResolvers(promiseResolvers.string)()).resolves.toBe(
        'string'
      )
    })

    it('should return errors when throwing inside resolvers', () => {
      expect(combineResolvers(promiseResolvers.error)())
        .resolves.toBeInstanceOf(Error)
        .resolves.toHaveProperty('message', 'some returned error')
    })
  })

  describe('real world', () => {
    /**
     * Sample resolver which returns an error in case no user
     * is available in the provided context.
     */
    const isAuthenticated = (root, args, { user }) =>
      user ? skip : new Error('Not authenticated')

    /**
     * Sample resolver which returns an error in case user
     * is not admin.
     */
    const isAdmin = combineResolvers(
      isAuthenticated,
      (root, args, { user: { role } }) =>
        role === 'admin' ? skip : new Error('Not admin')
    )

    /**
     * Sample factory resolver which returns error if user is
     * aged below allowed age.
     */
    const isNotUnderage = (minimumAge = 18) =>
      combineResolvers(isAuthenticated, (root, args, { user: { age } }) =>
        age < minimumAge ? new Error(`User is underage ${minimumAge}`) : skip
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
    const isValidOption = (root, { choice }) =>
      ['A', 'B', 'C'].indexOf(choice) > -1
        ? skip
        : new Error(`Option "${choice}" is invalid`)

    /**
     * Sample vote mutation.
     */
    const vote = combineResolvers(
      isNotUnderage(16),
      isValidOption,
      // Vote logic
      () => true
    )

    describe('functional', () => {
      describe('hello', () => {
        it('should return error when no user is logged in', () => {
          expect(hello(null, null, {}))
            .resolves.toBeInstanceOf(Error)
            .resolves.toHaveProperty('message', 'Not authenticated')
        })

        it('should return resolved value when user is logged in', () => {
          expect(
            hello(null, null, { user: { name: 'John Doe' } })
          ).resolves.toBe('Hello, John Doe')
        })
      })

      describe('sensitive', () => {
        it('should return error when no user is logged in', () => {
          expect(sensitive(null, null, {}))
            .resolves.toBeInstanceOf(Error)
            .resolves.toHaveProperty('message', 'Not authenticated')
        })

        it('should return error when no user is logged in', () => {
          expect(sensitive(null, null, { user: {} }))
            .resolves.toBeInstanceOf(Error)
            .resolves.toHaveProperty('message', 'Not admin')
        })

        it('should return resolved value when user is admin', () => {
          expect(
            sensitive(null, null, { user: { role: 'admin' } })
          ).resolves.toBe('shhhh!')
        })
      })

      describe('vote', () => {
        it('should return error when no user is logged in', () => {
          expect(vote(null, { choice: 'A' }, {}))
            .resolves.toBeInstanceOf(Error)
            .resolves.toHaveProperty('message', 'Not authenticated')
        })

        it('should return error when user is underage', () => {
          expect(vote(null, { choice: 'B' }, { user: { age: 10 } }))
            .resolves.toBeInstanceOf(Error)
            .resolves.toHaveProperty('message', 'User is underage 16')
        })

        it('should return error when options is invalid', () => {
          expect(vote(null, { choice: 'Z' }, { user: { age: 18 } }))
            .resolves.toBeInstanceOf(Error)
            .resolves.toHaveProperty('message', 'Option "Z" is invalid')
        })

        it('should return true when vote is registered', () => {
          expect(
            vote(null, { choice: 'C' }, { user: { age: 18 } })
          ).resolves.toBe(true)
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
        Mutation: { vote },
      }

      const schema = makeExecutableSchema({ typeDefs, resolvers })

      describe('hello', () => {
        it('should return error when no user is logged in', () => {
          expect(
            graphql(schema, '{ hello }', null, {})
          ).resolves.toHaveProperty('errors.0.message', 'Not authenticated')
        })

        it('should return resolved value when user is logged in', () => {
          expect(
            graphql(schema, '{ hello }', null, { user: { name: 'John Doe' } })
          ).resolves.toHaveProperty('data.hello', 'Hello, John Doe')
        })
      })

      describe('sensitive', () => {
        it('should return error when no user is logged in', () => {
          expect(
            graphql(schema, '{ sensitive }', null, {})
          ).resolves.toHaveProperty('errors.0.message', 'Not authenticated')
        })

        it('should return error when no user is logged in', () => {
          expect(
            graphql(schema, '{ sensitive }', null, { user: {} })
          ).resolves.toHaveProperty('errors.0.message', 'Not admin')
        })

        it('should return resolved value when user is admin', () => {
          expect(
            graphql(schema, '{ sensitive }', null, { user: { role: 'admin' } })
          ).resolves.toHaveProperty('data.sensitive', 'shhhh!')
        })
      })

      describe('vote', () => {
        it('should return error when no user is logged in', () => {
          expect(
            graphql(schema, 'mutation { vote(choice: "A") }', null, {})
          ).resolves.toHaveProperty('errors.0.message', 'Not authenticated')
        })

        it('should return error when user is underage', () => {
          expect(
            graphql(schema, 'mutation { vote(choice: "B") }', null, {
              user: { age: 10 },
            })
          ).resolves.toHaveProperty('errors.0.message', 'User is underage 16')
        })

        it('should return error when options is invalid', () => {
          expect(
            graphql(schema, 'mutation { vote(choice: "Z") }', null, {
              user: { age: 18 },
            })
          ).resolves.toHaveProperty('errors.0.message', 'Option "Z" is invalid')
        })

        it('should return true when vote is registered', () => {
          expect(
            graphql(schema, 'mutation { vote(choice: "C") }', null, {
              user: { age: 18 },
            })
          ).resolves.toHaveProperty('data.vote', true)
        })
      })
    })
  })
})
