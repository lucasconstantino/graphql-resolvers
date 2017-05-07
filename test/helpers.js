/* eslint-disable brace-style */

/**
 * Test helpers.
 */

import chai from 'chai'
import { skip } from '../src/utils'

import spies from 'chai-spies'

chai.use(spies)

export const resolvers = {
  skip: () => skip,
  empty: () => {},
  string: () => 'string',
  other: () => 'other',
  error: () => new Error('some returned error'),
  thrownError: () => { throw new Error('some throw error') },
}

// Wrap every resolver in promise resolvers for tests.
export const promiseResolvers = Object.keys(resolvers)
  .reduce((result, key) => Object.assign(result, {
    [key]: async (...args) => resolvers[key](...args)
  }), {})

// Wrap every resolver in spies for tests.
export const spyResolvers = Object.keys(resolvers)
  .reduce((result, key) => Object.assign(result, {
    [key]: chai.spy(resolvers[key])
  }), {})

export const clearSpyResolvers = () => Object.keys(spyResolvers)
  .forEach(key => spyResolvers[key].reset())
