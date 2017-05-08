// import { last, length, groupBy, pipe, prop, sortBy, values } from 'ramda'
import chai, { expect } from 'chai'
import spies from 'chai-spies'

import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'

import { pipeResolvers } from '../src/pipeResolvers'
import { isDependee, resolveDependee } from '../src/dependingResolvers'

// Apply chai extensions.
chai.use(spies)

describe('dependingResolvers', () => {
  const dependeeSource = chai.spy(() => 'dependee value')
  const dependee = isDependee(dependeeSource)
  const dependentSource = chai.spy(dependee => 'dependent and ' + dependee)
  const dependent = pipeResolvers(resolveDependee('dependee'), dependentSource)

  const typeDefs = `
    type Query {
      dependent: String
      dependee: String
    }

    schema {
      query: Query
    }
  `

  const resolvers = {
    Query: { dependee, dependent },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  afterEach(() => dependeeSource.reset())
  afterEach(() => dependentSource.reset())

  describe('isDependee', () => {
    it('should resolve value normally', async () => {
      const result = await graphql(schema, '{ dependee }', null, {})
      expect(result).to.have.deep.property('data.dependee', 'dependee value')
      expect(dependeeSource).to.have.been.called.once
    })

    it('should throw when context is not an object', async () => {
      const result = await graphql(schema, '{ dependee }', null, null)
      expect(result).to.have.deep.property('errors.0.message').equal(
        'Some functionality requires context to be an object.'
      )
    })
  })

  describe('resolveDependee', () => {
    it('should resolve dependent when requiring both fields', async () => {
      const result = await graphql(schema, '{ dependee, dependent }', null, {})
      expect(result).to.have.deep.property('data.dependent', 'dependent and dependee value')
      expect(dependeeSource).to.have.been.called.once
      expect(dependentSource).to.have.been.called.once
    })

    it('should resolve dependent when requiring only dependent', async () => {
      const result = await graphql(schema, '{ dependent }', null, {})
      expect(result).to.have.deep.property('data.dependent', 'dependent and dependee value')
      expect(dependeeSource).to.have.been.called.once
      expect(dependentSource).to.have.been.called.once
    })

    it('should throw when depending on a non existing field', async () => {
      // @TODO: any API way to temporarily remove a field from the schema?
      const dependee = schema._queryType._fields.dependee
      delete schema._queryType._fields.dependee

      const result = await graphql(schema, '{ dependent }', null, {})
      expect(result).to.have.deep.property('errors.0.message').equal(
        'Cannot get dependee "dependee" from field "dependent" on type "Query"'
      )

      // Put field back.
      schema._queryType._fields.dependee = dependee
    })

    it('should throw when context is not an object', async () => {
      const result = await graphql(schema, '{ dependent }', null, null)
      expect(result).to.have.deep.property('errors.0.message').equal(
        'Some functionality requires context to be an object.'
      )
    })
  })
})
