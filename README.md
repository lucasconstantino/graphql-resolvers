# GraphQL Resolvers

A library to simplify the development of GraphQL [resolvers](http://graphql.org/learn/execution/).

![Build status](https://travis-ci.org/lucasconstantino/graphql-resolvers.svg?branch=master)

## Installation

This package is available on [npm](https://www.npmjs.com/package/graphql-resolvers) as: *graphql-resolvers*

```
npm install graphql-resolvers
```

> You should consider using [yarn](https://yarnpkg.com/), though.

## Motivation

Many times we end-up repeating lots of logic on our resolvers. Access control, for instance, is something that can be done in the resolver level but just tends to end up with repeated code, even when creating services for such a task. This package aims to make it easier to build smart resolvers with logic being reusable and split in small pieces.

## How to use it

This library currently consists of single *[but well tested](test/combineResolvers.test.js)* helper function for combining other functions in a first-result-returns manner. GraphQL resolvers are just one kind of functions to benefit from this helper. Here is an example usage with [resolver maps](http://dev.apollodata.com/tools/graphql-tools/resolvers.html) and [graphql.js](https://github.com/graphql/graphql-js):

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

## Similar projects

Besides being inspired by some functional helpers out there, this project has some goals in common with other projects:

#### [apollo-resolvers](https://github.com/thebigredgeek/apollo-resolvers):

While `graphql-resolvers` follows the functional paradigm, this project solves the problem using an opinionated and OOP approach. Furthermore, this project also solves other problems which `graphql-resolvers` does not intend to work on, such as [solving circular references on the resolver's context](https://github.com/thebigredgeek/apollo-resolvers#resolver-context).

#### [graphql-tools](https://github.com/apollographql/graphql-tools)

At first, my idea was to [incorporate](https://github.com/apollographql/graphql-tools/issues/307) the `combineResolvers` method into the wider project `graphql-tools`. That may yet happen some day, but I think people my not want to install the whole `graphql-tools` project when wanting this simple package's helper on their projects. Also, `combineResolvers` should work pretty fine with resolvers binded into [`graphql/types`](http://graphql.org/graphql-js/type/) too.
