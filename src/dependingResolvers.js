import { push } from 'object-path'
import deepEqual from 'deep-equal'

import { nextTick, skip } from './utils'
import { allResolvers } from './allResolvers'
import { pipeResolvers } from './pipeResolvers'
import { combineResolvers } from './combineResolvers'
import { contextMustBeObject } from './miscResolvers'

/**
 * Piping resolver to save current value and reference to dependees cache.
 */
const saveDependee = combineResolvers(
  contextMustBeObject,
  (value, args, context, info) => (
    push(context, '_dependees', { path: info.path, value }), value
  )
)

/**
 * Identify a resolver as being a dependee, so other sibling
 * field resolvers might depend on the value resolved by this one.
 *
 * Basically, it will polute "info" during resolving
 * to insert the resolved value and path to this resolver.
 *
 * @param {Function} resolver Resolver implementation.
 * @return {Promise}.
 */
export const isDependee = resolver => (root, ...args) =>
  saveDependee(resolver(root, ...args), ...args)

/**
 * Make sure the field name exists on the parent type.
 *
 * @param {String} dependeeName The name of the dependee to check the parent against
 * @return {Function} Resolver to error when no dependee is found.
 */
const dependeeExists = dependeeName => (
  root,
  args,
  context,
  { fieldName, parentType: { _fields, name: parent } }
) =>
  !_fields[dependeeName]
    ? new Error(
        `Cannot get dependee "${dependeeName}" from field "${fieldName}" on type "${parent}"`
      )
    : skip

/**
 * Resolver implementation to retrieve the resolved value of a dependee sibling field.
 *
 * @param {String} dependeeName The name of the dependee this resolver depends on.
 * @param {Function} resolver Resolver implemenatation.
 * @return {Function} dependee resolver.
 */
export const resolveDependee = dependeeName =>
  combineResolvers(
    contextMustBeObject,
    dependeeExists(dependeeName),
    pipeResolvers(
      // Make sure dependent resolvers occur after
      // dependees have been initialized.
      nextTick,

      (root, args, context, info) => {
        const { _dependees = [] } = context
        // Find any currently resolved dependee.
        const resolved = _dependees
          .filter(({ path: { prev } }) => deepEqual(prev, info.path.prev))
          .find(({ path: { key } }) => key === dependeeName)

        // Run field resolution, if resolved value was not found.
        return resolved === skip
          ? info.parentType._fields[dependeeName].resolve(
              root,
              args,
              context,
              info
            )
          : resolved.value
      }
    )
  )

/**
 * Resolver implementation to retrieve the resolved value of multiple dependee sibling fields.
 *
 * @param {[String]} dependeeNames Array of names of the dependees this resolver depends on.
 * @param {Function} resolver Resolver implemenatation.
 * @return {Function} dependee resolver.
 */
export const resolveDependees = dependeeNames =>
  combineResolvers(
    contextMustBeObject,
    allResolvers(dependeeNames.map(resolveDependee))
  )
