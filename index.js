
// Utils.
module.exports.skip = require('./lib/utils.js').skip

// Composition utilities.
module.exports.allResolvers = require('./lib/allResolvers.js').allResolvers
module.exports.pipeResolvers = require('./lib/pipeResolvers.js').pipeResolvers
module.exports.combineResolvers = require('./lib/combineResolvers.js').combineResolvers

// Field dependency.
module.exports.isDependee = require('./lib/dependingResolvers.js').isDependee
module.exports.dependeeResolver = require('./lib/dependingResolvers.js').dependeeResolver
