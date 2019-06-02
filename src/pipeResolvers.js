/**
 * Resolver composition based on the root argument.
 *
 * @param {[Function]} ...funcs Resolver implementations.
 * @return {Promise}.
 */
export const pipeResolvers = (...funcs) => (...args) =>
  funcs.reduce(
    (prevPromise, resolver) =>
      prevPromise.then(root =>
        root instanceof Error ? root : resolver(root, ...args.slice(1))
      ),
    Promise.resolve(args[0])
  )
