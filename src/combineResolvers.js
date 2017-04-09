
/**
 * undefined wrap-up. Useful for opt-out of resolvers
 * with a function style.
 */
export const skip = undefined

/**
 * Left-first composition for methods of any type.
 *
 * @param {Function} ...funcs Resolver methods.
 * @return {Promise}.
 */
export const combineResolvers = (...funcs) => (...args) => funcs.reduce(
  (prevPromise, resolver) => prevPromise.then(
    prev => prev === skip ? resolver(...args) : prev)
  , Promise.resolve()
)
