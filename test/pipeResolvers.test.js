/* eslint-disable brace-style */
import { last, length, groupBy, pipe, prop, sortBy, values } from 'ramda'
import chai, { expect } from 'chai'
import promise from 'chai-as-promised'

import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'

import { pipeResolvers } from '../src/pipeResolvers'

import { resolvers, promiseResolvers, spyResolvers, clearSpyResolvers } from './helpers'

// Apply chai extensions.
chai.use(promise)

describe('pipeResolvers', () => {
  beforeEach(clearSpyResolvers)

  describe('single resolver', () => {
    it('should return a function once combined', () => {
      expect(typeof pipeResolvers()).to.equal('function')
      expect(typeof pipeResolvers(() => {})).to.equal('function')
      expect(typeof pipeResolvers(() => {}, () => {})).to.equal('function')
    })

    it('should return root argument when empty resolver', () => {
      return expect(pipeResolvers()(1)).to.eventually.equal(1)
    })

    it('should return undefined on skiped resolvers', () => {
      return expect(pipeResolvers(resolvers.skip)(1)).to.eventually.be.undefined
    })

    it('should return single resolver value', () => {
      return expect(pipeResolvers(resolvers.string)()).to.eventually.equal('string')
    })

    it('should return resolved errors', () => {
      return expect(pipeResolvers(resolvers.error)())
        .to.eventually.be.an('error')
        .and.have.property('message', 'some returned error')
    })

    it('should reject with thrown errors', () => {
      return expect(pipeResolvers(resolvers.thrownError)())
        .to.be.rejectedWith('some throw error')
    })

    it('should call resolver with all arguments received', async () => {
      await pipeResolvers(spyResolvers.empty)('foo')
      expect(spyResolvers.empty).to.have.been.called.with('foo')

      await pipeResolvers(spyResolvers.empty)('foo', 'bar', 'baz')
      expect(spyResolvers.empty).to.have.been.called.with('foo', 'bar', 'baz')
    })
  })

  describe('two resolvers', () => {
    it('should resolve only last value', async () => {
      await expect(pipeResolvers(resolvers.string, resolvers.other)()).to.eventually.equal('other')
      await expect(pipeResolvers(resolvers.string, resolvers.other)()).not.to.eventually.equal('string')
    })

    it('should execute resolvers in a pipe until last value is resolved', async () => {
      const result = await pipeResolvers(spyResolvers.string, spyResolvers.other)(1)
      expect(spyResolvers.string).to.have.been.called.once.with(1)
      expect(spyResolvers.other).to.have.been.called.once.with('string')
      expect(result).to.equal('other')
    })
  })

  describe('multiple resolvers', () => {
    it('should execute resolvers in a pipe until last value is resolved', async () => {
      const result = await pipeResolvers(
        spyResolvers.empty,
        spyResolvers.string,
        spyResolvers.other
      )(1)

      expect(spyResolvers.empty).to.have.been.called.once.with(1)
      expect(spyResolvers.string).to.have.been.called.once.with(undefined)
      expect(spyResolvers.other).to.have.been.called.with('string')
      expect(result).to.equal('other')
    })

    it('should execute resolvers in a pipe until error resolved', async () => {
      const result = await pipeResolvers(
        spyResolvers.empty,
        spyResolvers.error,
        spyResolvers.string
      )(1)

      expect(spyResolvers.empty).to.have.been.called.once.with(1)
      expect(spyResolvers.error).to.have.been.called.once.with(undefined)
      expect(spyResolvers.string).not.to.have.been.called.once
      expect(result).to.be.an('error').and.have.property('message', 'some returned error')
    })

    it('should execute resolvers in a pipe until error throw', async () => {
      const result = await expect(
        pipeResolvers(
          spyResolvers.empty,
          spyResolvers.thrownError,
          spyResolvers.string
        )(1)
      ).to.be.rejectedWith('some throw error')

      expect(spyResolvers.empty).to.have.been.called.once.with(1)
      expect(spyResolvers.thrownError).to.have.been.called.once.with(undefined)
      expect(spyResolvers.string).not.to.have.been.called.once
      expect(result).to.be.an('error').and.have.property('message', 'some throw error')
    })
  })

  describe('promises', () => {
    it('should return single promised resolver value', () => {
      return expect(pipeResolvers(promiseResolvers.string)()).to.eventually.equal('string')
    })

    it('should return errors when throwing inside resolvers', () => {
      return expect(pipeResolvers(promiseResolvers.error)())
        .to.eventually.be.an('error')
        .and.have.property('message', 'some returned error')
    })
  })

  describe('real world', () => {
    /**
     * Sample resolver for the current user object.
     */
    const user = (root, args, { user }) => user

    /**
     * Sample resolver for wheter user is logged in or not.
     */
    const loggedIn = pipeResolvers(user, user => !!user)

    const election = () => ({
      id: 1,
      votes: [
        { choice: 'A', id: 1 },
        { choice: 'B', id: 2 },
        { choice: 'C', id: 3 },
        { choice: 'B', id: 4 },
        { choice: 'C', id: 5 },
        { choice: 'C', id: 6 },
      ]
    })

    /**
     * Sample resolver for an array of votes.
     */
    const votes = election => election.votes

    /**
     * Sample resolver for the calculation of winner choice.
     */
    const winningChoice = pipeResolvers(votes, pipe(
      groupBy(prop('choice')),
      values,
      sortBy(length),
      last,
      last,
      prop('choice')
    ))

    describe('functional', () => {
      describe('loggedIn', () => {
        it('should return false when no user is logged in', () =>
          expect(loggedIn(null, null, {})).to.eventually.be.false
        )

        it('should return true when user is logged in', () =>
          expect(loggedIn(null, null, { user: {} })).to.eventually.be.true
        )
      })

      describe('winningChoice', () => {
        it('should return C for the sample election', () =>
          expect(winningChoice(election(), null, {})).to.eventually.equal('C')
        )
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
        it('should resolve user object from context', () =>
          expect(graphql(schema, '{ user { id } }', null, { user: { id: 3 } }))
            .to.eventually.have.deep.property('data.user.id').equal(3)
        )

        describe('loggedIn', () => {
          it('should resolve logged in true when user is available', () =>
            expect(graphql(schema, '{ loggedIn }', null, { user: { id: 3 } }))
              .to.eventually.have.deep.property('data.loggedIn').true
          )

          it('should resolve logged in false when user is not available', () =>
            expect(graphql(schema, '{ loggedIn }', null, {}))
              .to.eventually.have.deep.property('data.loggedIn').false
          )
        })
      })

      describe('election', () => {
        it('should resolve election object', () =>
          expect(graphql(schema, '{ election { id } }', null, {}))
            .to.eventually.have.deep.property('data.election.id').equal(1)
        )

        describe('votes', () => {
          it('should resolve votes array from election', () =>
            expect(graphql(schema, '{ election { votes { id } } }', null, {}))
              .to.eventually.have.deep.property('data.election.votes')
          )
        })

        describe('winningChoice', () => {
          it('should resolve winningChoice from election votes', () =>
            expect(graphql(schema, '{ election { winningChoice } }', null, {}))
              .to.eventually.have.deep.property('data.election.winningChoice').to.equal('C')
          )
        })
      })
    })
  })
})
