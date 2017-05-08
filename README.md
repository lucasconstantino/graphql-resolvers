# GraphQL Resolvers

Resolver composition library for GraphQL

[![build status](https://img.shields.io/travis/lucasconstantino/graphql-resolvers/master.svg?style=flat-square)](https://travis-ci.org/lucasconstantino/graphql-resolvers)
[![coverage](https://img.shields.io/codecov/c/github/lucasconstantino/graphql-resolvers.svg?style=flat-square)](https://codecov.io/github/lucasconstantino/graphql-resolvers)
[![npm version](https://img.shields.io/npm/v/graphql-resolvers.svg?style=flat-square)](https://www.npmjs.com/package/graphql-resolvers)

---

This library consists of simple *[but well tested](https://codecov.io/github/lucasconstantino/graphql-resolvers)* helper functions for combining other functions into more specialized ones.

## Installation

This package is available on [npm](https://www.npmjs.com/package/graphql-resolvers) as: *graphql-resolvers*

```
npm install graphql-resolvers
```

> You should consider using [yarn](https://yarnpkg.com/), though.

## Motivation

Many times we end-up repeating lots of logic on our resolvers. Access control, for instance, is something that can be done in the resolver level but just tends to end up with repeated code, even when creating services for such a task. This package aims to make it easier to build smart resolvers with logic being reusable and split in small pieces. Think *[recompose](https://github.com/acdlite/recompose)*, but for GraphQL resolvers.

## Documentation

[Read full documenation here](docs/API.md)

## Similar projects

Besides being inspired by some functional libraries out there, this project has some goals in common with other projects:

#### [apollo-resolvers](https://github.com/thebigredgeek/apollo-resolvers):

While `graphql-resolvers` follows the functional paradigm, `apollo-resolvers` project solves some problems using an opinionated and OOP approach. Furthermore, the second also solves other problems which `graphql-resolvers` does not intend to work on, such as [solving circular references on the resolver's context](https://github.com/thebigredgeek/apollo-resolvers#resolver-context).

#### [graphql-tools](https://github.com/apollographql/graphql-tools)

At first, my idea was to [incorporate](https://github.com/apollographql/graphql-tools/issues/307) the `combineResolvers` method into the wider project `graphql-tools`. That may yet happen some day, but I think people my not want to install the whole `graphql-tools` project when wanting this simple package's helper on their projects. Also, `combineResolvers` should work pretty fine with resolvers binded into [`graphql/types`](http://graphql.org/graphql-js/type/) too.
