// import { last, length, groupBy, pipe, prop, sortBy, values } from 'ramda'
import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'

import { pipeResolvers } from '../src/pipeResolvers'
import {
  isDependee,
  resolveDependee,
  resolveDependees,
} from '../src/dependingResolvers'

/**
 * Helper method to delay a value retriaval.
 */
const delayed = value =>
  new Promise(resolve => setTimeout(() => resolve(value), 50))

/**
 * Setup resolvers with dependencies between them.
 * @return {Object} resolvers.
 */
const setupResolvers = () => {
  const resolvers = {}
  const sources = {}

  sources.dependee = jest.fn(() => 'dependee value')
  resolvers.dependee = isDependee(sources.dependee)

  sources.delayedDependee = jest.fn(() => delayed('delayedDependee value'))
  resolvers.delayedDependee = isDependee(sources.delayedDependee)

  sources.dependent = jest.fn(dependee => 'dependent and ' + dependee)
  resolvers.dependent = pipeResolvers(
    resolveDependee('dependee'),
    sources.dependent
  )

  sources.dependentOnDelayed = jest.fn(
    delayedDependee => 'dependentOnDelayed and ' + delayedDependee
  )
  resolvers.dependentOnDelayed = pipeResolvers(
    resolveDependee('delayedDependee'),
    sources.dependentOnDelayed
  )

  sources.dependents = jest.fn(dependees => dependees)
  resolvers.dependents = pipeResolvers(
    resolveDependees(['dependee', 'delayedDependee']),
    sources.dependents
  )

  return { resolvers, sources }
}

describe('dependingResolvers', () => {
  describe('RootQuery', () => {
    const setup = () => {
      const typeDefs = `
        type Query {
          dependee: String
          dependent: String

          delayedDependee: String
          dependentOnDelayed: String

          dependents: [String]
        }

        schema {
          query: Query
        }
      `

      const { resolvers, sources } = setupResolvers()

      const schema = makeExecutableSchema({
        typeDefs,
        resolvers: { Query: resolvers },
      })

      return { schema, resolvers, sources }
    }

    describe('isDependee', () => {
      it('should resolve value normally', async () => {
        const {
          schema,
          sources: { dependee },
        } = setup()
        const result = await graphql(schema, '{ dependee }', null, {})
        expect(result).toHaveProperty('data.dependee', 'dependee value')
        expect(dependee).toHaveBeenCalledTimes(1)
      })

      it('should resolve value normally, even when resolved to a promise', async () => {
        const {
          schema,
          sources: { delayedDependee },
        } = setup()
        const result = await graphql(schema, '{ delayedDependee }', null, {})
        expect(result).toHaveProperty(
          'data.delayedDependee',
          'delayedDependee value'
        )
        expect(delayedDependee).toHaveBeenCalledTimes(1)
      })

      it('should throw when context is not an object', async () => {
        const { schema } = setup()
        const result = await graphql(schema, '{ dependee }', null, null)
        expect(result).toHaveProperty(
          'errors.0.message',
          'Some functionality requires context to be an object.'
        )
      })
    })

    describe('resolveDependee', () => {
      it('should resolve dependent when requiring both fields', async () => {
        const {
          schema,
          sources: { dependee, dependent },
        } = setup()
        const result = await graphql(
          schema,
          '{ dependee, dependent }',
          null,
          {}
        )
        expect(result).toHaveProperty(
          'data.dependent',
          'dependent and dependee value'
        )
        expect(dependee).toHaveBeenCalledTimes(1)
        expect(dependent).toHaveBeenCalledTimes(1)
      })

      it('should resolve dependent when requiring only dependent', async () => {
        const {
          schema,
          sources: { dependee, dependent },
        } = setup()
        const result = await graphql(schema, '{ dependent }', null, {})
        expect(result).toHaveProperty(
          'data.dependent',
          'dependent and dependee value'
        )
        expect(dependee).toHaveBeenCalledTimes(1)
        expect(dependent).toHaveBeenCalledTimes(1)
      })

      it('should throw when depending on a non existing field', async () => {
        const { schema } = setup()

        // @TODO: any API way to temporarily remove a field from the schema?
        delete schema._queryType._fields.dependee

        const result = await graphql(schema, '{ dependent }', null, {})
        expect(result).toHaveProperty(
          'errors.0.message',
          'Cannot get dependee "dependee" from field "dependent" on type "Query"'
        )
      })

      it('should throw when context is not an object', async () => {
        const { schema } = setup()
        const result = await graphql(schema, '{ dependent }', null, null)
        expect(result).toHaveProperty(
          'errors.0.message',
          'Some functionality requires context to be an object.'
        )
      })

      it('should resolve dependee only once, even when it resolves to a promise', async () => {
        const {
          schema,
          sources: { delayedDependee, dependentOnDelayed },
        } = setup()
        const result = await graphql(
          schema,
          '{ delayedDependee, dependentOnDelayed }',
          null,
          {}
        )

        expect(result).toHaveProperty(
          'data.dependentOnDelayed',
          'dependentOnDelayed and delayedDependee value'
        )
        expect(delayedDependee).toHaveBeenCalledTimes(1)
        expect(dependentOnDelayed).toHaveBeenCalledTimes(1)
      })
    })

    describe('resolveDependees', () => {
      it('should resolve dependents when requiring all fields', async () => {
        const {
          schema,
          sources: { dependee, delayedDependee, dependents },
        } = setup()
        const result = await graphql(
          schema,
          '{ dependee, delayedDependee, dependents }',
          null,
          {}
        )
        expect(result).toHaveProperty('data.dependents.0', 'dependee value')
        expect(result).toHaveProperty(
          'data.dependents.1',
          'delayedDependee value'
        )
        expect(dependee).toHaveBeenCalledTimes(1)
        expect(delayedDependee).toHaveBeenCalledTimes(1)
        expect(dependents).toHaveBeenCalledTimes(1)
      })

      it('should resolve dependents when requiring only dependent field', async () => {
        const {
          schema,
          sources: { dependee, delayedDependee, dependents },
        } = setup()
        const result = await graphql(schema, '{ dependents }', null, {})
        expect(result).toHaveProperty('data.dependents.0', 'dependee value')
        expect(result).toHaveProperty(
          'data.dependents.1',
          'delayedDependee value'
        )
        expect(dependee).toHaveBeenCalledTimes(1)
        expect(delayedDependee).toHaveBeenCalledTimes(1)
        expect(dependents).toHaveBeenCalledTimes(1)
      })

      it('should throw when depending on a non existing field', async () => {
        const { schema } = setup()

        // @TODO: any API way to temporarily remove a field from the schema?
        delete schema._queryType._fields.dependee

        const result = await graphql(schema, '{ dependents }', null, {})
        expect(result).toHaveProperty(
          'errors.0.message',
          'Cannot get dependee "dependee" from field "dependents" on type "Query"'
        )
      })

      it('should throw when context is not an object', async () => {
        const { schema } = setup()
        const result = await graphql(schema, '{ dependents }', null, null)
        expect(result).toHaveProperty(
          'errors.0.message',
          'Some functionality requires context to be an object.'
        )
      })
    })
  })

  describe('Custom type', () => {
    const setup = () => {
      const typeDefs = `
        type Type {
          dependee: String
          dependent: String

          delayedDependee: String
          dependentOnDelayed: String

          dependents: [String]
        }

        type Query {
          type: Type
        }

        schema {
          query: Query
        }
      `

      const { resolvers, sources } = setupResolvers()

      const schema = makeExecutableSchema({
        typeDefs,
        resolvers: {
          Query: {
            type: () => ({
              id: 'TYPE_ID',
            }),
          },
          Type: resolvers,
        },
      })

      return { schema, resolvers, sources }
    }

    describe('isDependee', () => {
      it('should resolve value normally', async () => {
        const {
          schema,
          sources: { dependee },
        } = setup()
        const result = await graphql(schema, '{ type { dependee } }', null, {})
        expect(result).toHaveProperty('data.type.dependee', 'dependee value')
        expect(dependee).toHaveBeenCalledTimes(1)
      })

      it('should resolve value normally, even when resolved to a promise', async () => {
        const {
          schema,
          sources: { delayedDependee },
        } = setup()
        const result = await graphql(
          schema,
          '{ type { delayedDependee } }',
          null,
          {}
        )
        expect(result).toHaveProperty(
          'data.type.delayedDependee',
          'delayedDependee value'
        )
        expect(delayedDependee).toHaveBeenCalledTimes(1)
      })

      it('should resolve value normally, even when resolved to a promise', async () => {
        const {
          schema,
          sources: { delayedDependee },
        } = setup()
        const result = await graphql(
          schema,
          '{ type { delayedDependee } }',
          null,
          {}
        )
        expect(result).toHaveProperty(
          'data.type.delayedDependee',
          'delayedDependee value'
        )
        expect(delayedDependee).toHaveBeenCalledTimes(1)
      })

      it('should throw when context is not an object', async () => {
        const { schema } = setup()
        const result = await graphql(
          schema,
          '{ type { dependee } }',
          null,
          null
        )
        expect(result).toHaveProperty(
          'errors.0.message',
          'Some functionality requires context to be an object.'
        )
      })
    })

    describe('resolveDependee', () => {
      it('should resolve dependent when requiring both fields', async () => {
        const {
          schema,
          sources: { dependee, dependent },
        } = setup()
        const result = await graphql(
          schema,
          '{ type { dependee, dependent } }',
          null,
          {}
        )
        expect(result).toHaveProperty(
          'data.type.dependent',
          'dependent and dependee value'
        )
        expect(dependee).toHaveBeenCalledTimes(1)
        expect(dependent).toHaveBeenCalledTimes(1)
      })

      it('should resolve dependent when requiring only dependent', async () => {
        const {
          schema,
          sources: { dependee, dependent },
        } = setup()
        const result = await graphql(schema, '{ type { dependent } }', null, {})
        expect(result).toHaveProperty(
          'data.type.dependent',
          'dependent and dependee value'
        )
        expect(dependee).toHaveBeenCalledTimes(1)
        expect(dependent).toHaveBeenCalledTimes(1)
      })

      it('should throw when depending on a non existing field', async () => {
        const { schema } = setup()

        // @TODO: any API way to temporarily remove a field from the schema?
        delete schema._typeMap.Type._fields.dependee

        const result = await graphql(schema, '{ type { dependent } }', null, {})
        expect(result).toHaveProperty(
          'errors.0.message',
          'Cannot get dependee "dependee" from field "dependent" on type "Type"'
        )
      })

      it('should throw when context is not an object', async () => {
        const { schema } = setup()
        const result = await graphql(
          schema,
          '{ type { dependent } }',
          null,
          null
        )
        expect(result).toHaveProperty(
          'errors.0.message',
          'Some functionality requires context to be an object.'
        )
      })

      it('should resolve dependee only once, even when it resolves to a promise', async () => {
        const {
          schema,
          sources: { delayedDependee, dependentOnDelayed },
        } = setup()
        const result = await graphql(
          schema,
          '{ type { delayedDependee, dependentOnDelayed } }',
          null,
          {}
        )

        expect(result).toHaveProperty(
          'data.type.dependentOnDelayed',
          'dependentOnDelayed and delayedDependee value'
        )
        expect(delayedDependee).toHaveBeenCalledTimes(1)
        expect(dependentOnDelayed).toHaveBeenCalledTimes(1)
      })
    })

    describe('resolveDependees', () => {
      it('should resolve dependents when requiring all fields', async () => {
        const {
          schema,
          sources: { dependee, delayedDependee, dependents },
        } = setup()
        const result = await graphql(
          schema,
          '{ type { dependee, delayedDependee, dependents } }',
          null,
          {}
        )
        expect(result).toHaveProperty(
          'data.type.dependents.0',
          'dependee value'
        )
        expect(result).toHaveProperty(
          'data.type.dependents.1',
          'delayedDependee value'
        )
        expect(dependee).toHaveBeenCalledTimes(1)
        expect(dependee).toHaveBeenCalledWith(
          { id: 'TYPE_ID' },
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
        expect(delayedDependee).toHaveBeenCalledTimes(1)
        expect(delayedDependee).toHaveBeenCalledWith(
          { id: 'TYPE_ID' },
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
        expect(dependents).toHaveBeenCalledTimes(1)
      })

      it('should resolve dependents when requiring only dependent field', async () => {
        const {
          schema,
          sources: { dependee, delayedDependee, dependents },
        } = setup()

        const result = await graphql(
          schema,
          '{ type { dependents } }',
          null,
          {}
        )
        expect(result).toHaveProperty(
          'data.type.dependents.0',
          'dependee value'
        )

        expect(result).toHaveProperty(
          'data.type.dependents.1',
          'delayedDependee value'
        )

        expect(dependee).toHaveBeenCalledTimes(1)
        expect(dependee).toHaveBeenCalledWith(
          { id: 'TYPE_ID' },
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
        expect(delayedDependee).toHaveBeenCalledTimes(1)
        expect(delayedDependee).toHaveBeenCalledWith(
          { id: 'TYPE_ID' },
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
        expect(dependents).toHaveBeenCalledTimes(1)
      })

      it('should throw when depending on a non existing field', async () => {
        const { schema } = setup()

        // @TODO: any API way to temporarily remove a field from the schema?
        delete schema._typeMap.Type._fields.dependee

        const result = await graphql(
          schema,
          '{ type { dependents } }',
          null,
          {}
        )
        expect(result).toHaveProperty(
          'errors.0.message',
          'Cannot get dependee "dependee" from field "dependents" on type "Type"'
        )
      })

      it('should throw when context is not an object', async () => {
        const { schema } = setup()
        const result = await graphql(
          schema,
          '{ type { dependents } }',
          null,
          null
        )
        expect(result).toHaveProperty(
          'errors.0.message',
          'Some functionality requires context to be an object.'
        )
      })
    })
  })
})
