import { skip } from './utils'

/**
 * Logging resolver. Useful for debugging.
 */
export const loggingResolver = (...args) => (
  console.log(args, 'Logging resolver'), skip
)

/**
 * Combining resolver to error when context is no object.
 */
export const contextMustBeObject = (root, args, context) =>
  context instanceof Object
    ? skip
    : new Error('Some functionality requires context to be an object.')
