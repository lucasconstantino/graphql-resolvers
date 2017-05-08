# GraphQL Resolvers

Resolver composition library for GraphQL

[![build status](https://img.shields.io/travis/lucasconstantino/graphql-resolvers/master.svg?style=flat-square)](https://travis-ci.org/lucasconstantino/graphql)
[![coverage](https://img.shields.io/codecov/c/github/lucasconstantino/graphql-resolvers.svg?style=flat-square)](https://codecov.io/github/lucasconstantino/graphql-resolvers)
[![npm version](https://img.shields.io/npm/v/graphql-resolvers.svg?style=flat-square)](https://www.npmjs.com/package/graphql-resolvers)


## Installation

This package is available on [npm](https://www.npmjs.com/package/graphql-resolvers) as: *graphql-resolvers*

```
npm install graphql-resolvers
```

> You should consider using [yarn](https://yarnpkg.com/), though.

## Motivation

Many times we end-up repeating lots of logic on our resolvers. Access control, for instance, is something that can be done in the resolver level but just tends to end up with repeated code, even when creating services for such a task. This package aims to make it easier to build smart resolvers with logic being reusable and split in small pieces.

## How to use it

This library currently consists of two simple *but [well](test/combineResolvers.test.js) [tested](test/pipeResolvers.test.js)* helper functions for combining other functions into a more specialized one. It is much like *compose* or *[pipe](http://ramdajs.com/docs/#pipe)* do, but they are more intended to be used for GraphQL resolvers - even though these are just one kind of functionality to benefit from this helper.

### `combinedResolvers`

Helper for combining other functions in a first-result-returns manner. Here is an example usage with [resolver maps](http://dev.apollodata.com/tools/graphql-tools/resolvers.html) and [graphql.js](https://github.com/graphql/graphql-js):

```js
import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'
import { skip, combineResolvers } from 'graphql-resolvers'

const typeDefs = `
  type Query {
    sensitive: String!
  }

  schema {
    query: Query
  }
`

/**
 * Sample resolver which returns an error in case no user
 * is available in the provided context.
 */
const isAuthenticated = (root, args, { user }) => user ? skip : new Error('Not authenticated')

/**
 * Sample resolver which returns an error in case user
 * is not admin.
 */
const isAdmin = combineResolvers(
  isAuthenticated,
  (root, args, { user: { role } }) => role === 'admin' ? skip : new Error('Not authorized')
)

/**
 * Sample sensitive information resolver, for admins only.
 */
const sensitive = combineResolvers(
  isAdmin,
  (root, args, { user: { name } }) => 'shhhh!'
)

// Resolver map
const resolvers = { Query: { sensitive } }

const schema = makeExecutableSchema({ typeDefs, resolvers })

// Resolves with a "Non authenticated" error.
graphql(schema, '{ sensitive }', null, { }).then(console.log)

// Resolves with a "Not authorized" error.
graphql(schema, '{ sensitive }', null, { user: { role: 'some-role' } }).then(console.log)

// Resolves with a sensitive field containing "shhhh!".
graphql(schema, '{ sensitive }', null, { user: { role: 'admin' } }).then(console.log)
```

---

### `pipeResolvers`

Helper for combining other functions in a piping manner, where each will provide the next with a newly resolved root. Usually this kind of need is accomplished by GraphQL itself using nested types, but sometimes, for instance, you simply want to reuse a logic from a sibling resolver in another one, and GraphQL won't help you there. Here goes a sample:

```js
import { last, length, groupBy, pipe, prop, sortBy, values } from 'ramda'
import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'
import { pipeResolvers } from 'graphql-resolvers'

const typeDefs = `
  type Vote {
    choice: String
  }

  type Query {
    votes: [Vote]
    winningChoice: String
  }

  schema {
    query: Query
  }
`

/**
 * Sample resolver for an array of votes.
 */
const votes = () => [
  { choice: 'A', id: 1 },
  { choice: 'B', id: 2 },
  { choice: 'C', id: 3 },
  { choice: 'B', id: 4 },
  { choice: 'C', id: 5 },
  { choice: 'C', id: 6 },
]

/**
 * Sample resolver for the calculation of winner choice.
 * If you are not used to functional programming with Ramda, worry not: the "pipe"
 * call below will return a function, which when called with an array of votes (such
 * as the one above) will return the choice, as a string, which occurs more times. In
 * this case, "C".
 */
const winningChoice = pipeResolvers(votes, pipe(
  groupBy(prop('choice')),
  values,
  sortBy(length),
  last,
  last,
  prop('choice')
))

// Resolver map
const resolvers = { Query: { votes, winningChoice } }

const schema = makeExecutableSchema({ typeDefs, resolvers })

// Resolves with winningChoice equal to "C".
graphql(schema, '{ winningChoice }').then(console.log)
```

---

## Similar projects

Besides being inspired by some functional helpers out there, this project has some goals in common with other projects:

#### [apollo-resolvers](https://github.com/thebigredgeek/apollo-resolvers):

While `graphql-resolvers` follows the functional paradigm, `apollo-resolvers` project solves the problem using an opinionated and OOP approach. Furthermore, the second also solves other problems which `graphql-resolvers` does not intend to work on, such as [solving circular references on the resolver's context](https://github.com/thebigredgeek/apollo-resolvers#resolver-context).

#### [graphql-tools](https://github.com/apollographql/graphql-tools)

At first, my idea was to [incorporate](https://github.com/apollographql/graphql-tools/issues/307) the `combineResolvers` method into the wider project `graphql-tools`. That may yet happen some day, but I think people my not want to install the whole `graphql-tools` project when wanting this simple package's helper on their projects. Also, `combineResolvers` should work pretty fine with resolvers binded into [`graphql/types`](http://graphql.org/graphql-js/type/) too.
