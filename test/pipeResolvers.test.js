/* eslint-disable brace-style */
import { last, length, groupBy, pipe, prop, sortBy, values } from 'ramda'

import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'

import { pipeResolvers } from '../src/pipeResolvers'

import {
  resolvers as utilResolvers,
  promiseResolvers,
  spyResolvers,
} from './helpers'

describe('pipeResolvers', () => {
  beforeEach(jest.clearAllMocks)

  describe('single resolver', () => {
    it('should return a function once combined', () => {
      expect(typeof pipeResolvers()).toEqual('function')
      expect(typeof pipeResolvers(() => {})).toEqual('function')
      expect(
        typeof pipeResolvers(
          () => {},
          () => {}
        )
      ).toEqual('function')
    })

    it('should return root argument when empty resolver', () => {
      expect(pipeResolvers()(1)).resolves.toEqual(1)
    })

    it('should return undefined on skiped resolvers', () => {
      expect(pipeResolvers(utilResolvers.skip)(1)).resolves.toBe(undefined)
    })

    it('should return single resolver value', () => {
      expect(pipeResolvers(utilResolvers.string)()).resolves.toEqual('string')
    })

    it('should return resolved errors', () => {
      expect(pipeResolvers(utilResolvers.error)())
        .resolves.toBeInstanceOf(Error)
        .resolves.toHaveProperty('message', 'some returned error')
    })

    it('should reject with thrown errors', () => {
      expect(pipeResolvers(utilResolvers.thrownError)()).rejects.toThrow(
        'some throw error'
      )
    })

    it('should call resolver with all arguments received', async () => {
      await pipeResolvers(spyResolvers.empty)('foo')
      expect(spyResolvers.empty).toHaveBeenCalledWith('foo')

      await pipeResolvers(spyResolvers.empty)('foo', 'bar', 'baz')
      expect(spyResolvers.empty).toHaveBeenCalledWith('foo', 'bar', 'baz')
    })
  })

  describe('two resolvers', () => {
    it('should resolve only last value', () => {
      expect(
        pipeResolvers(utilResolvers.string, utilResolvers.other)()
      ).resolves.toEqual('other')

      expect(
        pipeResolvers(utilResolvers.string, utilResolvers.other)()
      ).resolves.not.toEqual('string')
    })

    it('should execute resolvers in a pipe until last value is resolved', async () => {
      const result = await pipeResolvers(
        spyResolvers.string,
        spyResolvers.other
      )(1)

      expect(spyResolvers.string).toHaveBeenCalledTimes(1)
      expect(spyResolvers.string).toHaveBeenCalledWith(1)
      expect(spyResolvers.other).toHaveBeenCalledTimes(1)
      expect(spyResolvers.other).toHaveBeenCalledWith('string')
      expect(result).toEqual('other')
    })
  })

  describe('multiple resolvers', () => {
    it('should execute resolvers in a pipe until last value is resolved', async () => {
      const result = await pipeResolvers(
        spyResolvers.empty,
        spyResolvers.string,
        spyResolvers.other
      )(1)

      expect(spyResolvers.empty).toHaveBeenCalledTimes(1)
      expect(spyResolvers.empty).toHaveBeenCalledWith(1)
      expect(spyResolvers.string).toHaveBeenCalledTimes(1)
      expect(spyResolvers.string).toHaveBeenCalledWith(undefined)
      expect(spyResolvers.other).toHaveBeenCalledWith('string')
      expect(result).toEqual('other')
    })

    it('should execute resolvers in a pipe until error resolved', async () => {
      const result = await pipeResolvers(
        spyResolvers.empty,
        spyResolvers.error,
        spyResolvers.string
      )(1)

      expect(spyResolvers.empty).toHaveBeenCalledTimes(1)
      expect(spyResolvers.empty).toHaveBeenCalledWith(1)
      expect(spyResolvers.error).toHaveBeenCalledTimes(1)
      expect(spyResolvers.error).toHaveBeenCalledWith(undefined)
      expect(spyResolvers.string).not.toHaveBeenCalled()
      expect(result)
        .toBeInstanceOf(Error)
        .toHaveProperty('message', 'some returned error')
    })

    it('should execute resolvers in a pipe until error throw', async () => {
      const result = await pipeResolvers(
        spyResolvers.empty,
        spyResolvers.thrownError,
        spyResolvers.string
      )(1).catch(err => err)

      expect(result)
        .toBeInstanceOf(Error)
        .toHaveProperty('message', 'some throw error')

      expect(spyResolvers.empty).toHaveBeenCalledTimes(1)
      expect(spyResolvers.empty).toHaveBeenCalledWith(1)
      expect(spyResolvers.thrownError).toHaveBeenCalledTimes(1)
      expect(spyResolvers.thrownError).toHaveBeenCalledWith(undefined)
      expect(spyResolvers.string).not.toHaveBeenCalled()
    })
  })

  describe('promises', () => {
    it('should return single promised resolver value', () => {
      expect(pipeResolvers(promiseResolvers.string)()).resolves.toEqual(
        'string'
      )
    })

    it('should return errors when throwing inside resolvers', () => {
      expect(pipeResolvers(promiseResolvers.error)())
        .resolves.toBeInstanceOf(Error)
        .resolves.toHaveProperty('message', 'some returned error')
    })
  })

  describe('real world', () => {
    /**
     * Sample resolver for the current user object.
     */
    const user = (root, args, context) => context.user

    /**
     * Sample resolver for whether user is logged in or not.
     */
    const loggedIn = pipeResolvers(user, currentUser => !!currentUser)

    const election = () => ({
      id: 1,
      votes: [
        { choice: 'A', id: 1 },
        { choice: 'B', id: 2 },
        { choice: 'C', id: 3 },
        { choice: 'B', id: 4 },
        { choice: 'C', id: 5 },
        { choice: 'C', id: 6 },
      ],
    })

    /**
     * Sample resolver for an array of votes.
     */
    const votes = currentElection => currentElection.votes

    /**
     * Sample resolver for the calculation of winner choice.
     */
    const winningChoice = pipeResolvers(
      votes,
      pipe(
        groupBy(prop('choice')),
        values,
        sortBy(length),
        last,
        last,
        prop('choice')
      )
    )

    describe('functional', () => {
      describe('loggedIn', () => {
        it('should return false when no user is logged in', () => {
          expect(loggedIn(null, null, {})).resolves.toBe(false)
        })

        it('should return true when user is logged in', () => {
          expect(loggedIn(null, null, { user: {} })).resolves.toBe(true)
        })
      })

      describe('winningChoice', () => {
        it('should return C for the sample election', () => {
          expect(winningChoice(election(), null, {})).resolves.toEqual('C')
        })
      })
    })

    describe('GraphQL instance', () => {
      const typeDefs = `
        type User {
          id: Int
        }

        type Election {
          id: Int
          votes: [Vote]
          winningChoice: String
        }

        type Vote {
          id: Int
          choice: String
        }

        type Query {
          user: User
          loggedIn: Boolean!
          election: Election
        }

        schema {
          query: Query
        }
      `

      const resolvers = {
        Query: { election, user, loggedIn },
        Election: { votes, winningChoice },
      }

      const schema = makeExecutableSchema({ typeDefs, resolvers })

      describe('authentication', () => {
        it('should resolve user object from context', () => {
          expect(
            graphql(schema, '{ user { id } }', null, { user: { id: 3 } })
          ).resolves.toHaveProperty('data.user.id', 3)
        })

        describe('loggedIn', () => {
          it('should resolve logged in true when user is available', () => {
            expect(
              graphql(schema, '{ loggedIn }', null, { user: { id: 3 } })
            ).resolves.toHaveProperty('data.loggedIn', true)
          })

          it('should resolve logged in false when user is not available', () => {
            expect(
              graphql(schema, '{ loggedIn }', null, {})
            ).resolves.toHaveProperty('data.loggedIn', false)
          })
        })
      })

      describe('election', () => {
        it('should resolve election object', () => {
          expect(
            graphql(schema, '{ election { id } }', null, {})
          ).resolves.toHaveProperty('data.election.id', 1)
        })

        describe('votes', () => {
          it('should resolve votes array from election', () => {
            expect(
              graphql(schema, '{ election { votes { id } } }', null, {})
            ).resolves.toHaveProperty('data.election.votes')
          })
        })

        describe('winningChoice', () => {
          it('should resolve winningChoice from election votes', () => {
            expect(
              graphql(schema, '{ election { winningChoice } }', null, {})
            ).resolves.toHaveProperty('data.election.winningChoice', 'C')
          })
        })
      })
    })
  })
})
