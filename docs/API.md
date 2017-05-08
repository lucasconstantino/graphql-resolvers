# API

In this API docs, a **resolver**, **resolver function**, or `ResolverFunction` all refer to a function with the same signature as described on [this documentation](http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-function-signature).

## Contents

- [Utilities](#utilities)
  - [`combineResolvers()`](#combineresolvers)
  - [`pipeResolvers()`](#piperesolvers)
- [Field dependencies](#field-dependencies)
  - [`isDependee()`](#isdependee)
  - [`resolveDependee()`](#resolvedependee)
  - [`resolveDependees()`](#resolvedependees)
  - [example](#field-dependency-example)

### Utilities

Generic resolver composition helpers.

#### `combineResolvers()`

```js
combineResolvers(
  ...resolvers: Array<ResolverFunction>
): ResolverFunction
```

Combines resolver functions into one resolver in a first-result-returns manner: all resolvers will be called sequentially with the same initial arguments until one resolves to something other than `undefined`; when that happens, the resolved value will be returned and the remaining resolver functions will be ignored.

Useful for things like authorization and access control.

##### Sample:

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

#### `pipeResolvers()`

```js
pipeResolvers(
  ...resolvers: Array<ResolverFunction>
): ResolverFunction
```

Combines resolver functions into one resolver in a piping manner: all resolvers will be called sequentially with the first argument (`root`) being the result of the previous resolver, and the rest being the initial provided argument. The last resolved value will be returned.

> This is usually something that gets done using GraphQL nesting nature. Sometimes, though, you simply want to reuse logic for things that should not be available on your GraphQL API.

##### Sample:

```js
import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'
import { pipeResolvers } from 'graphql-resolvers'

const typeDefs = `
  type User {
    id: String
    name: String
  }

  type Query {
    user: User
  }

  schema {
    query: Query
  }
`

/**
 * Reusable resolver to get the request object from the context.
 */
const getRequest = (root, args, { req }) => req

/**
 * Resolver to get current logged user.
 */
const user = pipeResolvers(getRequest, ({ user }) => user)

const schema = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: { user }
  }
})

// Resolves with { data: { user: null } }
graphql(schema, '{ user { id } }', null, {}).then(console.log)

// Resolves with { data: { user: { id: 1 } } }
graphql(schema, '{ user { id } }', null, { user: { id: 1 } }).then(console.log)
```

---

#### `allResolvers()`

```js
allResolvers(
  resolvers: Array<ResolverFunction>
): ResolverFunction
```

Combines a resolver array into one resolver that will resolve all in parallel and return and array of resolved values.

---

### Field dependency tools

GraphQL currently does not support a field to depend on the resolved result of another field. For these situations, `graphql-resolvers` provides a suit of methods to allow for execution based field dependencies.

#### `resolveDependee()`

```js
resolveDependee(
  dependeeName: string
): ResolverFunction
```

Factory for a resolver which would resolve a sibling field's value. If *dependeeName* field is not a Scalar, it will run it's resolver function.

#### `resolveDependees()`

```js
resolveDependee(
  dependeeNames: Array<string>
): ResolverFunction
```

Same as `resolveDependees`, but resolves an array of dependees.

#### `isDependee()`

```js
resolveDependee(
  resolver: ResolverFunction
): ResolverFunction
```

Wraps a resolver to identify it as being the resolver of a possible dependee field.

Even though this is not mandatory, it will help prevent a resolver to be executed more then once when using the field dependency system.

#### Field dependency example

Having a schema such as...

```graphql
type Vote {
  id: Int
  choice: String
}

type Query {
  votes: [Vote]
  winningChoice: String
}

schema {
  query: Query
}
```

...where `winningChoice` field depends on the computed value of it's sibling field `votes`, you could write your resolvers as follows:

```js
import R from 'ramda'
import { isDependee, resolveDependee, pipeResolvers } from 'graphql-resolvers'

// Sample data.
const votesData = [
  { choice: 'A', id: 1 },
  { choice: 'B', id: 2 },
  { choice: 'C', id: 3 },
  { choice: 'B', id: 4 },
  { choice: 'C', id: 5 },
  { choice: 'C', id: 6 },
]

// Resolvers

const votes = isDependee(() => votesData)

/**
 * Sample resolver for the calculation of winner choice.
 *
 * From the data above we know 'C' is the winning choice,
 * so to simplify things we will resolve it statically.
 */
const winningChoice = pipeResolvers(
  resolveDependee('votes'),
  votes => {
    // ...computed winning choice from array of votes.
    return 'C'
  }
)

export const resolvers = {
  Query: {
    votes,
    winningChoice,
  }
}
```
