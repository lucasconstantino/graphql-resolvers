// import { last, length, groupBy, pipe, prop, sortBy, values } from 'ramda'
import { allResolvers } from '../src/allResolvers'
import { pipeResolvers } from '../src/pipeResolvers'

describe('allResolvers', () => {
  const stringResolver = jest.fn(() => 'string')
  const numberResolver = jest.fn(() => 2)
  const pipedResolver = jest.fn(pipeResolvers(stringResolver, numberResolver))

  beforeEach(jest.clearAllMocks)

  it('should resolve to an empty array when resolvers array is empty', () => {
    expect(allResolvers([])()).resolves.toEqual([])
  })

  it('should resolve a single resolver', () => {
    expect(allResolvers([stringResolver])()).resolves.toEqual(['string'])
  })

  it('should resolve multiple resolvers', () => {
    expect(allResolvers([stringResolver, numberResolver])()).resolves.toEqual([
      'string',
      2
    ])
  })

  it('should resolve composed resolvers', () => {
    expect(
      allResolvers([stringResolver, numberResolver, pipedResolver])()
    ).resolves.toEqual(['string', 2, 2])
  })

  it('should throw when no argument is provided', () => {
    expect(() => allResolvers()()).toThrow()
  })

  it('should pass any argument to the resolvers', async () => {
    await allResolvers([stringResolver, numberResolver])(1, 2, 3, 4, 5)

    expect(stringResolver).toHaveBeenCalledTimes(1)
    expect(stringResolver).toHaveBeenCalledWith(1, 2, 3, 4, 5)
    expect(numberResolver).toHaveBeenCalledTimes(1)
    expect(numberResolver).toHaveBeenCalledWith(1, 2, 3, 4, 5)
  })
})
