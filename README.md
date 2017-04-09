# GraphQL Combine Resolvers

A library to simplify composition of GraphQL [resolvers](http://graphql.org/learn/execution/).

![Build status](https://travis-ci.org/lucasconstantino/graphql-combine-resolvers.svg?branch=master)

## Installation

This package is available on [npm](https://www.npmjs.com/package/graphql-combine-resolvers) as: *graphql-combine-resolvers*

```
npm install graphql-combine-resolvers
```

> You should consider using [yarn](https://yarnpkg.com/), though.

## Motivation

Many times we end-up repeating lots of logic on our resolvers. Access control, for instance, is something that can be done in the resolver level but just tends to end up with repeated code, even when creating services for such a task. This package solves it in a very simple and functional manner.
