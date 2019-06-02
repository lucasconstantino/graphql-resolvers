/**
 * undefined wrap-up. Useful for opt-out of resolvers
 * with a function style.
 */
export const skip = undefined

/**
 * Composable next tick simulation.
 */
export const nextTick = value =>
  new Promise(resolve => setTimeout(() => resolve(value), 0))
