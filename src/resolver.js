import _ from 'lodash';
import { GraphQLList } from 'graphql';
import argsToFindOptions from './argsToFindOptions';
import { isConnection, handleConnection, nodeType } from './relay';
import invariant from 'assert';
import camelCase from 'lodash/camelCase';
import Promise from 'bluebird';
// import dataLoaderSequelize from 'dataloader-sequelize';

function resolverFactory(target, options) {
  // dataLoaderSequelize(target);

  var resolver
    , targetAttributes
    , isModel = !!target.getTableName
    , isAssociation = !!target.associationType
    , association = isAssociation && target
    , model = isAssociation && target.target || isModel && target;

  targetAttributes = Object.keys(model.rawAttributes);

  options = options || {};

  invariant(options.include === undefined, 'Include support has been removed in favor of dataloader batching');
  if (options.before === undefined) options.before = (options) => options;
  if (options.after === undefined) options.after = (result) => result;
  if (options.handleConnection === undefined) options.handleConnection = true;

  resolver = function (source, args, context, info) {
    var type = info.returnType
      , list = options.list || type instanceof GraphQLList
      , findOptions = argsToFindOptions(args, targetAttributes);

    info = {
      ...info,
      type: type,
      source: source
    };

    context = context || {};

    if (isConnection(type)) {
      type = nodeType(type);
    }

    type = type.ofType || type;

    findOptions.attributes = targetAttributes;
    findOptions.logging = findOptions.logging || context.logging;

    return Promise.resolve(options.before(findOptions, args, context, info)).then(function (findOptions) {
      if (list && !findOptions.order) {
        findOptions.order = [[model.primaryKeyAttribute, 'ASC']];
      }

      if (association) {
        if (source.get(association.as) !== undefined) {
          // The user did a manual include
          const result = source.get(association.as);
          if (options.handleConnection && isConnection(info.returnType)) {
            return handleConnection(result, args);
          }

          return result;
        } else {
          return source[association.accessors.get](findOptions).then(function (result) {
            if (options.handleConnection && isConnection(info.returnType)) {
              return handleConnection(result, args);
            }
            return result;
          });
        }
      }

      if (findOptions.include) {
        buildInclude(findOptions.include, model);
      }

      return model[list ? 'findAll' : 'findOne'](findOptions);
    }).then(function (result) {
      return options.after(result, args, context, info);
    });
  };

  return resolver;
}

module.exports = resolverFactory;

function buildInclude(passedInclude, model) {
  _.each(passedInclude, function (includeObj) {
    if (!includeObj.model) return;
    var association =
      model.associations[
        typeof includeObj.model === 'string'
        ? camelCase(includeObj.model)
        : includeObj.model.name
      ];
    includeObj.model = association.target;
    includeObj.as = association.as;
    if (includeObj.include) {
      buildInclude(includeObj.include, association.target);
    }
  });
  passedInclude = _.toArray(passedInclude);
}
