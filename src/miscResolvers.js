
import { skip } from './utils'

/**
 * Logging resolver. Useful for debugging.
 */
export const loggingResolver = (root, args, context, info) => ((
  console.log({ root, args, context, info }),
  skip
))

/**
 * Combining resolver to error when context is no object.
 */
export const contextMustBeObject = (root, args, context) => context instanceof Object
  ? skip
  : new Error('Some functionality requires context to be an object.')
