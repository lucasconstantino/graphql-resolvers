// Utils.
module.exports.skip = require('./lib/utils.js').skip

// Composition utilities.
module.exports.allResolvers = require('./lib/allResolvers.js').allResolvers
module.exports.pipeResolvers = require('./lib/pipeResolvers.js').pipeResolvers
module.exports.combineResolvers = require('./lib/combineResolvers.js').combineResolvers

// Aliases.
module.exports.all = module.exports.allResolvers
module.exports.pipe = module.exports.pipeResolvers
module.exports.combine = module.exports.combineResolvers

// Field dependency.
module.exports.isDependee = require('./lib/dependingResolvers.js').isDependee
module.exports.resolveDependee = require('./lib/dependingResolvers.js').resolveDependee
module.exports.resolveDependees = require('./lib/dependingResolvers.js').resolveDependees
