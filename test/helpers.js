/* eslint-disable brace-style */

/**
 * Test helpers.
 */

import { skip } from '../src/utils'

export const resolvers = {
  skip: () => skip,
  empty: () => {},
  string: () => 'string',
  other: () => 'other',
  error: () => new Error('some returned error'),
  thrownError: () => {
    throw new Error('some throw error')
  },
}

// Wrap every resolver in promise resolvers for tests.
export const promiseResolvers = Object.keys(resolvers).reduce(
  (result, key) =>
    Object.assign(result, {
      [key]: async (...args) => await resolvers[key](...args),
    }),
  {}
)

// Wrap every resolver in spies for tests.
export const spyResolvers = Object.keys(resolvers).reduce(
  (result, key) =>
    Object.assign(result, {
      [key]: jest.fn(resolvers[key]),
    }),
  {}
)
