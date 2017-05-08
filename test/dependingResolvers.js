// import { last, length, groupBy, pipe, prop, sortBy, values } from 'ramda'
import chai, { expect } from 'chai'
import spies from 'chai-spies'

import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'

import { pipeResolvers } from '../src/pipeResolvers'
import { isDependee, resolveDependee, resolveDependees } from '../src/dependingResolvers'

// Apply chai extensions.
chai.use(spies)

describe('dependingResolvers', () => {
  describe('RootQuery', () => {
    const dependeeSource = chai.spy(() => 'dependee value')
    const dependee = isDependee(dependeeSource)

    const secondDependeeSource = chai.spy(() => 'secondDependee value')
    const secondDependee = isDependee(secondDependeeSource)

    const dependentSource = chai.spy(dependee => 'dependent and ' + dependee)
    const dependent = pipeResolvers(resolveDependee('dependee'), dependentSource)

    const dependentsSource = chai.spy(dependees => dependees)
    const dependents = pipeResolvers(resolveDependees(['dependee', 'secondDependee']), dependentsSource)

    const typeDefs = `
    type Query {
      dependee: String
      dependent: String

      secondDependee: String
      dependents: [String]
    }

    schema {
      query: Query
    }
    `

    const resolvers = {
      Query: { dependee, dependent, secondDependee, dependents },
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers })

    afterEach(() => dependeeSource.reset())
    afterEach(() => secondDependeeSource.reset())
    afterEach(() => dependentSource.reset())
    afterEach(() => dependentsSource.reset())

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

    describe('resolveDependees', () => {
      it('should resolve dependents when requiring all fields', async () => {
        const result = await graphql(schema, '{ dependee, secondDependee, dependents }', null, {})
        expect(result).to.have.deep.property('data.dependents.0', 'dependee value')
        expect(result).to.have.deep.property('data.dependents.1', 'secondDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(secondDependeeSource).to.have.been.called.once
        expect(dependentsSource).to.have.been.called.once
      })

      it('should resolve dependents when requiring only dependent field', async () => {
        const result = await graphql(schema, '{ dependents }', null, {})
        expect(result).to.have.deep.property('data.dependents.0', 'dependee value')
        expect(result).to.have.deep.property('data.dependents.1', 'secondDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(secondDependeeSource).to.have.been.called.once
        expect(dependentsSource).to.have.been.called.once
      })

      it('should throw when depending on a non existing field', async () => {
        // @TODO: any API way to temporarily remove a field from the schema?
        const dependee = schema._queryType._fields.dependee
        delete schema._queryType._fields.dependee

        const result = await graphql(schema, '{ dependents }', null, {})
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Cannot get dependee "dependee" from field "dependents" on type "Query"'
        )

        // Put field back.
        schema._queryType._fields.dependee = dependee
      })

      it('should throw when context is not an object', async () => {
        const result = await graphql(schema, '{ dependents }', null, null)
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Some functionality requires context to be an object.'
        )
      })
    })
  })

  describe('Custom type', () => {
    const dependeeSource = chai.spy(() => 'dependee value')
    const dependee = isDependee(dependeeSource)

    const secondDependeeSource = chai.spy(() => 'secondDependee value')
    const secondDependee = isDependee(secondDependeeSource)

    const dependentSource = chai.spy(dependee => 'dependent and ' + dependee)
    const dependent = pipeResolvers(resolveDependee('dependee'), dependentSource)

    const dependentsSource = chai.spy(dependees => dependees)
    const dependents = pipeResolvers(resolveDependees(['dependee', 'secondDependee']), dependentsSource)

    const typeDefs = `
    type Type {
      dependee: String
      dependent: String

      secondDependee: String
      dependents: [String]
    }

    type Query {
      type: Type
    }

    schema {
      query: Query
    }
    `

    const resolvers = {
      Query: { type: () => ({}) },
      Type: { dependee, dependent, secondDependee, dependents },
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers })

    afterEach(() => dependeeSource.reset())
    afterEach(() => secondDependeeSource.reset())
    afterEach(() => dependentSource.reset())
    afterEach(() => dependentsSource.reset())

    describe('isDependee', () => {
      it('should resolve value normally', async () => {
        const result = await graphql(schema, '{ type { dependee } }', null, {})
        expect(result).to.have.deep.property('data.type.dependee', 'dependee value')
        expect(dependeeSource).to.have.been.called.once
      })

      it('should throw when context is not an object', async () => {
        const result = await graphql(schema, '{ type { dependee } }', null, null)
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Some functionality requires context to be an object.'
        )
      })
    })

    describe('resolveDependee', () => {
      it('should resolve dependent when requiring both fields', async () => {
        const result = await graphql(schema, '{ type { dependee, dependent } }', null, {})
        expect(result).to.have.deep.property('data.type.dependent', 'dependent and dependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(dependentSource).to.have.been.called.once
      })

      it('should resolve dependent when requiring only dependent', async () => {
        const result = await graphql(schema, '{ type { dependent } }', null, {})
        expect(result).to.have.deep.property('data.type.dependent', 'dependent and dependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(dependentSource).to.have.been.called.once
      })

      it('should throw when depending on a non existing field', async () => {
        // @TODO: any API way to temporarily remove a field from the schema?
        const dependee = schema._typeMap.Type._fields.dependee
        delete schema._typeMap.Type._fields.dependee

        const result = await graphql(schema, '{ type { dependent } }', null, {})
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Cannot get dependee "dependee" from field "dependent" on type "Type"'
        )

        // Put field back.
        schema._typeMap.Type._fields.dependee = dependee
      })

      it('should throw when context is not an object', async () => {
        const result = await graphql(schema, '{ type { dependent } }', null, null)
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Some functionality requires context to be an object.'
        )
      })
    })

    describe('resolveDependees', () => {
      it('should resolve dependents when requiring all fields', async () => {
        const result = await graphql(schema, '{ type { dependee, secondDependee, dependents } }', null, {})
        expect(result).to.have.deep.property('data.type.dependents.0', 'dependee value')
        expect(result).to.have.deep.property('data.type.dependents.1', 'secondDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(secondDependeeSource).to.have.been.called.once
        expect(dependentsSource).to.have.been.called.once
      })

      it('should resolve dependents when requiring only dependent field', async () => {
        const result = await graphql(schema, '{ type { dependents } }', null, {})
        expect(result).to.have.deep.property('data.type.dependents.0', 'dependee value')
        expect(result).to.have.deep.property('data.type.dependents.1', 'secondDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(secondDependeeSource).to.have.been.called.once
        expect(dependentsSource).to.have.been.called.once
      })

      it('should throw when depending on a non existing field', async () => {
        // @TODO: any API way to temporarily remove a field from the schema?
        const dependee = schema._typeMap.Type._fields.dependee
        delete schema._typeMap.Type._fields.dependee

        const result = await graphql(schema, '{ type { dependents } }', null, {})
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Cannot get dependee "dependee" from field "dependents" on type "Type"'
        )

        // Put field back.
        schema._typeMap.Type._fields.dependee = dependee
      })

      it('should throw when context is not an object', async () => {
        const result = await graphql(schema, '{ type { dependents } }', null, null)
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Some functionality requires context to be an object.'
        )
      })
    })
  })
})
