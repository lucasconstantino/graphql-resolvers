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

    const promiseDependeeSource = chai.spy(() => new Promise(resolve => {
      setTimeout(() => {
        resolve('promiseDependee value')
      }, 30)
    }))
    const promiseDependee = isDependee(promiseDependeeSource)

    const secondDependeeSource = chai.spy(() => 'secondDependee value')
    const secondDependee = isDependee(secondDependeeSource)

    const secondPromiseDependeeSource = chai.spy(() => new Promise(resolve => {
      setTimeout(() => {
        resolve('secondPromiseDependee value')
      }, 30)
    }))
    const secondPromiseDependee = isDependee(secondPromiseDependeeSource)

    const dependentSource = chai.spy(dependee => 'dependent and ' + dependee)
    const dependent = pipeResolvers(resolveDependee('dependee'), dependentSource)

    const promiseDependentSource = chai.spy(dependee => 'promiseDependent and ' + dependee)
    const promiseDependent = pipeResolvers(resolveDependee('promiseDependee'), promiseDependentSource)

    const dependentsSource = chai.spy(dependees => dependees)
    const dependents = pipeResolvers(resolveDependees(['dependee', 'secondDependee']), dependentsSource)

    const promiseDependentsSource = chai.spy(dependees => dependees)
    const promiseDependents = pipeResolvers(resolveDependees(['promiseDependee', 'secondPromiseDependee']), promiseDependentsSource)

    const typeDefs = `
    type Query {
      dependee: String
      promiseDependee: String
      dependent: String
      promiseDependent: String

      secondDependee: String
      secondPromiseDependee: String
      dependents: [String]
      promiseDependents: [String]
    }

    schema {
      query: Query
    }
    `

    const resolvers = {
      Query: {
        dependee,
        promiseDependee,
        dependent,
        promiseDependent,
        secondDependee,
        secondPromiseDependee,
        dependents,
        promiseDependents,
      },
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers })

    afterEach(() => dependeeSource.reset())
    afterEach(() => promiseDependeeSource.reset())
    afterEach(() => secondDependeeSource.reset())
    afterEach(() => secondPromiseDependeeSource.reset())
    afterEach(() => dependentSource.reset())
    afterEach(() => dependentsSource.reset())
    afterEach(() => promiseDependentSource.reset())
    afterEach(() => promiseDependentsSource.reset())

    describe('isDependee', () => {
      it('should resolve value normally', async () => {
        const result = await graphql(schema, '{ dependee, promiseDependee }', null, {})
        expect(result).to.have.deep.property('data.dependee', 'dependee value')
        expect(result).to.have.deep.property('data.promiseDependee', 'promiseDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(promiseDependeeSource).to.have.been.called.once
      })

      it('should throw when context is not an object', async () => {
        const result = await graphql(schema, '{ dependee, promiseDependee }', null, null)
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Some functionality requires context to be an object.'
        )
        expect(result).to.have.deep.property('errors.1.message').equal(
          'Some functionality requires context to be an object.'
        )
      })
    })

    describe('resolveDependee', () => {
      it('should resolve dependent when requiring both fields', async () => {
        const result = await graphql(schema, '{ dependee, dependent }', null, {})
        const promiseResult = await graphql(schema, '{ promiseDependee, promiseDependent }', null, {})
        expect(result).to.have.deep.property('data.dependent', 'dependent and dependee value')
        expect(promiseResult).to.have.deep.property('data.promiseDependent', 'promiseDependent and promiseDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(dependentSource).to.have.been.called.once
        expect(promiseDependeeSource).to.have.been.called.once
        expect(promiseDependentSource).to.have.been.called.once
      })

      it('should resolve dependent when requiring only dependent', async () => {
        const result = await graphql(schema, '{ dependent }', null, {})
        const promiseResult = await graphql(schema, '{ promiseDependent }', null, {})
        expect(result).to.have.deep.property('data.dependent', 'dependent and dependee value')
        expect(promiseResult).to.have.deep.property('data.promiseDependent', 'promiseDependent and promiseDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(dependentSource).to.have.been.called.once
        expect(promiseDependeeSource).to.have.been.called.once
        expect(promiseDependentSource).to.have.been.called.once
      })

      it('should throw when depending on a non existing field', async () => {
        // @TODO: any API way to temporarily remove a field from the schema?
        const dependee = schema._queryType._fields.dependee
        const promiseDependee = schema._queryType._fields.promiseDependee
        delete schema._queryType._fields.dependee
        delete schema._queryType._fields.promiseDependee

        const result = await graphql(schema, '{ dependent, promiseDependent }', null, {})
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Cannot get dependee "dependee" from field "dependent" on type "Query"'
        )
        expect(result).to.have.deep.property('errors.1.message').equal(
          'Cannot get dependee "promiseDependee" from field "promiseDependent" on type "Query"'
        )

        // Put field back.
        schema._queryType._fields.dependee = dependee
        schema._queryType._fields.promiseDependee = promiseDependee
      })

      it('should throw when context is not an object', async () => {
        const result = await graphql(schema, '{ dependent, promiseDependent }', null, null)
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Some functionality requires context to be an object.'
        )
        expect(result).to.have.deep.property('errors.1.message').equal(
          'Some functionality requires context to be an object.'
        )
      })
    })

    describe('resolveDependees', () => {
      it('should resolve dependents when requiring all fields', async () => {
        const result = await graphql(schema, '{ dependee, secondDependee, dependents }', null, {})
        const promiseResult = await graphql(schema, '{ promiseDependee, secondPromiseDependee, promiseDependents }', null, {})
        expect(result).to.have.deep.property('data.dependents.0', 'dependee value')
        expect(result).to.have.deep.property('data.dependents.1', 'secondDependee value')
        expect(promiseResult).to.have.deep.property('data.promiseDependents.0', 'promiseDependee value')
        expect(promiseResult).to.have.deep.property('data.promiseDependents.1', 'secondPromiseDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(secondDependeeSource).to.have.been.called.once
        expect(dependentsSource).to.have.been.called.once
        expect(promiseDependeeSource).to.have.been.called.once
        expect(secondPromiseDependeeSource).to.have.been.called.once
        expect(promiseDependentsSource).to.have.been.called.once
      })

      it('should resolve dependents when requiring only dependent field', async () => {
        const result = await graphql(schema, '{ dependents, promiseDependents }', null, {})
        expect(result).to.have.deep.property('data.dependents.0', 'dependee value')
        expect(result).to.have.deep.property('data.dependents.1', 'secondDependee value')
        expect(result).to.have.deep.property('data.promiseDependents.0', 'promiseDependee value')
        expect(result).to.have.deep.property('data.promiseDependents.1', 'secondPromiseDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(secondDependeeSource).to.have.been.called.once
        expect(dependentsSource).to.have.been.called.once
        expect(promiseDependeeSource).to.have.been.called.once
        expect(secondPromiseDependeeSource).to.have.been.called.once
        expect(promiseDependentsSource).to.have.been.called.once
      })

      it('should throw when depending on a non existing field', async () => {
        // @TODO: any API way to temporarily remove a field from the schema?
        const dependee = schema._queryType._fields.dependee
        const promiseDependee = schema._queryType._fields.promiseDependee
        delete schema._queryType._fields.dependee
        delete schema._queryType._fields.promiseDependee

        const result = await graphql(schema, '{ dependents, promiseDependents }', null, {})
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Cannot get dependee "dependee" from field "dependents" on type "Query"'
        )
        expect(result).to.have.deep.property('errors.1.message').equal(
          'Cannot get dependee "promiseDependee" from field "promiseDependents" on type "Query"'
        )

        // Put field back.
        schema._queryType._fields.dependee = dependee
        schema._queryType._fields.promiseDependee = promiseDependee
      })

      it('should throw when context is not an object', async () => {
        const result = await graphql(schema, '{ dependents, promiseDependents }', null, null)
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Some functionality requires context to be an object.'
        )
        expect(result).to.have.deep.property('errors.1.message').equal(
          'Some functionality requires context to be an object.'
        )
      })
    })
  })

  describe('Custom type', () => {
    const dependeeSource = chai.spy(() => 'dependee value')
    const dependee = isDependee(dependeeSource)

    const promiseDependeeSource = chai.spy(() => new Promise(resolve => {
      setTimeout(() => {
        resolve('promiseDependee value')
      }, 30)
    }))
    const promiseDependee = isDependee(promiseDependeeSource)

    const secondDependeeSource = chai.spy(() => 'secondDependee value')
    const secondDependee = isDependee(secondDependeeSource)

    const secondPromiseDependeeSource = chai.spy(() => new Promise(resolve => {
      setTimeout(() => {
        resolve('secondPromiseDependee value')
      }, 30)
    }))
    const secondPromiseDependee = isDependee(secondPromiseDependeeSource)

    const dependentSource = chai.spy(dependee => 'dependent and ' + dependee)
    const dependent = pipeResolvers(resolveDependee('dependee'), dependentSource)

    const promiseDependentSource = chai.spy(dependee => 'promiseDependent and ' + dependee)
    const promiseDependent = pipeResolvers(resolveDependee('promiseDependee'), promiseDependentSource)

    const dependentsSource = chai.spy(dependees => dependees)
    const dependents = pipeResolvers(resolveDependees(['dependee', 'secondDependee']), dependentsSource)

    const promiseDependentsSource = chai.spy(dependees => dependees)
    const promiseDependents = pipeResolvers(resolveDependees(['promiseDependee', 'secondPromiseDependee']), promiseDependentsSource)

    const typeDefs = `
    type Type {
      dependee: String
      promiseDependee: String
      dependent: String
      promiseDependent: String

      secondDependee: String
      secondPromiseDependee: String
      dependents: [String]
      promiseDependents: [String]
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
      Type: {
        dependee,
        promiseDependee,
        dependent,
        promiseDependent,
        secondDependee,
        secondPromiseDependee,
        dependents,
        promiseDependents,
      },
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers })

    afterEach(() => dependeeSource.reset())
    afterEach(() => promiseDependeeSource.reset())
    afterEach(() => secondDependeeSource.reset())
    afterEach(() => secondPromiseDependeeSource.reset())
    afterEach(() => dependentSource.reset())
    afterEach(() => dependentsSource.reset())
    afterEach(() => promiseDependentSource.reset())
    afterEach(() => promiseDependentsSource.reset())

    describe('isDependee', () => {
      it('should resolve value normally', async () => {
        const result = await graphql(schema, '{ type { dependee, promiseDependee } }', null, {})
        expect(result).to.have.deep.property('data.type.dependee', 'dependee value')
        expect(result).to.have.deep.property('data.type.promiseDependee', 'promiseDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(promiseDependeeSource).to.have.been.called.once
      })

      it('should throw when context is not an object', async () => {
        const result = await graphql(schema, '{ type { dependee, promiseDependee } }', null, null)
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Some functionality requires context to be an object.'
        )
        expect(result).to.have.deep.property('errors.1.message').equal(
          'Some functionality requires context to be an object.'
        )
      })
    })

    describe('resolveDependee', () => {
      it('should resolve dependent when requiring both fields', async () => {
        const result = await graphql(schema, '{ type { dependee, dependent } }', null, {})
        const promiseResult = await graphql(schema, '{ type { promiseDependee, promiseDependent } }', null, {})
        expect(result).to.have.deep.property('data.type.dependent', 'dependent and dependee value')
        expect(promiseResult).to.have.deep.property('data.type.promiseDependent', 'promiseDependent and promiseDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(dependentSource).to.have.been.called.once
        expect(promiseDependeeSource).to.have.been.called.once
        expect(promiseDependentSource).to.have.been.called.once
      })

      it('should resolve dependent when requiring only dependent', async () => {
        const result = await graphql(schema, '{ type { dependent } }', null, {})
        const promiseResult = await graphql(schema, '{ type { promiseDependent } }', null, {})
        expect(result).to.have.deep.property('data.type.dependent', 'dependent and dependee value')
        expect(promiseResult).to.have.deep.property('data.type.promiseDependent', 'promiseDependent and promiseDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(dependentSource).to.have.been.called.once
        expect(promiseDependeeSource).to.have.been.called.once
        expect(promiseDependentSource).to.have.been.called.once
      })

      it('should throw when depending on a non existing field', async () => {
        // @TODO: any API way to temporarily remove a field from the schema?
        const dependee = schema._typeMap.Type._fields.dependee
        const promiseDependee = schema._typeMap.Type._fields.promiseDependee
        delete schema._typeMap.Type._fields.dependee
        delete schema._typeMap.Type._fields.promiseDependee

        const result = await graphql(schema, '{ type { dependent, promiseDependent } }', null, {})
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Cannot get dependee "dependee" from field "dependent" on type "Type"'
        )
        expect(result).to.have.deep.property('errors.1.message').equal(
          'Cannot get dependee "promiseDependee" from field "promiseDependent" on type "Type"'
        )

        // Put field back.
        schema._typeMap.Type._fields.dependee = dependee
        schema._typeMap.Type._fields.promiseDependee = promiseDependee
      })

      it('should throw when context is not an object', async () => {
        const result = await graphql(schema, '{ type { dependent, promiseDependent } }', null, null)
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Some functionality requires context to be an object.'
        )
        expect(result).to.have.deep.property('errors.1.message').equal(
          'Some functionality requires context to be an object.'
        )
      })
    })

    describe('resolveDependees', () => {
      it('should resolve dependents when requiring all fields', async () => {
        const result = await graphql(schema, '{ type { dependee, secondDependee, dependents } }', null, {})
        const promiseResult = await graphql(schema, '{ type { promiseDependee, secondPromiseDependee, promiseDependents } }', null, {})
        expect(result).to.have.deep.property('data.type.dependents.0', 'dependee value')
        expect(result).to.have.deep.property('data.type.dependents.1', 'secondDependee value')
        expect(promiseResult).to.have.deep.property('data.type.promiseDependents.0', 'promiseDependee value')
        expect(promiseResult).to.have.deep.property('data.type.promiseDependents.1', 'secondPromiseDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(secondDependeeSource).to.have.been.called.once
        expect(dependentsSource).to.have.been.called.once
        expect(promiseDependeeSource).to.have.been.called.once
        expect(secondPromiseDependeeSource).to.have.been.called.once
        expect(promiseDependentsSource).to.have.been.called.once
      })

      it('should resolve dependents when requiring only dependent field', async () => {
        const result = await graphql(schema, '{ type { dependents, promiseDependents } }', null, {})
        expect(result).to.have.deep.property('data.type.dependents.0', 'dependee value')
        expect(result).to.have.deep.property('data.type.dependents.1', 'secondDependee value')
        expect(result).to.have.deep.property('data.type.promiseDependents.0', 'promiseDependee value')
        expect(result).to.have.deep.property('data.type.promiseDependents.1', 'secondPromiseDependee value')
        expect(dependeeSource).to.have.been.called.once
        expect(secondDependeeSource).to.have.been.called.once
        expect(dependentsSource).to.have.been.called.once
        expect(promiseDependeeSource).to.have.been.called.once
        expect(secondPromiseDependeeSource).to.have.been.called.once
        expect(promiseDependentsSource).to.have.been.called.once
      })

      it('should throw when depending on a non existing field', async () => {
        // @TODO: any API way to temporarily remove a field from the schema?
        const dependee = schema._typeMap.Type._fields.dependee
        const promiseDependee = schema._typeMap.Type._fields.promiseDependee
        delete schema._typeMap.Type._fields.dependee
        delete schema._typeMap.Type._fields.promiseDependee

        const result = await graphql(schema, '{ type { dependents, promiseDependents } }', null, {})
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Cannot get dependee "dependee" from field "dependents" on type "Type"'
        )
        expect(result).to.have.deep.property('errors.1.message').equal(
          'Cannot get dependee "promiseDependee" from field "promiseDependents" on type "Type"'
        )

        // Put field back.
        schema._typeMap.Type._fields.dependee = dependee
        schema._typeMap.Type._fields.promiseDependee = promiseDependee
      })

      it('should throw when context is not an object', async () => {
        const result = await graphql(schema, '{ type { dependents, promiseDependents } }', null, null)
        expect(result).to.have.deep.property('errors.0.message').equal(
          'Some functionality requires context to be an object.'
        )
        expect(result).to.have.deep.property('errors.1.message').equal(
          'Some functionality requires context to be an object.'
        )
      })
    })
  })
})
