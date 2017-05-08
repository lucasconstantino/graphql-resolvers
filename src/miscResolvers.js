
import { skip } from './utils'
import { pipeResolvers } from './pipeResolvers'

/**
 * Logging resolver. Useful for debugging.
 */
export const loggingResolver = (...args) => ((
  console.log(args, 'Logging resolver'),
  skip
))

/**
 * Combining resolver to error when context is no object.
 */
export const contextMustBeObject = (root, args, context) => context instanceof Object
  ? skip
  : new Error('Some functionality requires context to be an object.')

/**
 * Resolver implementation to resolve and array of resolvers into an array of results.
 *
 * @param {[Function]} resolvers Array of resolvers.
 * @return {Function} resolver.
 */
export const allResolvers = resolvers => (...args) => Promise.all(
  resolvers.map(resolver => resolver(...args))
)
