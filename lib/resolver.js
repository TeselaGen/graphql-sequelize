'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _graphql = require('graphql');

var _argsToFindOptions = require('./argsToFindOptions');

var _argsToFindOptions2 = _interopRequireDefault(_argsToFindOptions);

var _relay = require('./relay');

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _camelCase = require('lodash/camelCase');

var _camelCase2 = _interopRequireDefault(_camelCase);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import dataLoaderSequelize from 'dataloader-sequelize';

function resolverFactory(target, options) {
  // dataLoaderSequelize(target);

  var resolver,
      targetAttributes,
      isModel = !!target.getTableName,
      isAssociation = !!target.associationType,
      association = isAssociation && target,
      model = isAssociation && target.target || isModel && target;

  targetAttributes = Object.keys(model.rawAttributes);

  options = options || {};

  (0, _assert2.default)(options.include === undefined, 'Include support has been removed in favor of dataloader batching');
  if (options.before === undefined) options.before = options => options;
  if (options.after === undefined) options.after = result => result;
  if (options.handleConnection === undefined) options.handleConnection = true;

  resolver = function resolver(source, args, context, info) {
    var type = info.returnType,
        list = options.list || type instanceof _graphql.GraphQLList,
        findOptions = (0, _argsToFindOptions2.default)(args, targetAttributes);

    info = _extends({}, info, {
      type: type,
      source: source
    });

    context = context || {};

    if ((0, _relay.isConnection)(type)) {
      type = (0, _relay.nodeType)(type);
    }

    type = type.ofType || type;

    findOptions.attributes = targetAttributes;
    findOptions.logging = findOptions.logging || context.logging;

    return _bluebird2.default.resolve(options.before(findOptions, args, context, info)).then(function (findOptions) {
      if (list && !findOptions.order) {
        findOptions.order = [[model.primaryKeyAttribute, 'ASC']];
      }

      if (association) {
        if (source.get(association.as) !== undefined) {
          // The user did a manual include
          const result = source.get(association.as);
          if (options.handleConnection && (0, _relay.isConnection)(info.returnType)) {
            return (0, _relay.handleConnection)(result, args);
          }

          return result;
        } else {
          return source[association.accessors.get](findOptions).then(function (result) {
            if (options.handleConnection && (0, _relay.isConnection)(info.returnType)) {
              return (0, _relay.handleConnection)(result, args);
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
  _lodash2.default.each(passedInclude, function (includeObj) {
    if (!includeObj.model) return;
    var association = model.associations[typeof includeObj.model === 'string' ? (0, _camelCase2.default)(includeObj.model) : includeObj.model.name];
    includeObj.model = association.target;
    includeObj.as = association.as;
    if (includeObj.include) {
      buildInclude(includeObj.include, association.target);
    }
  });
  passedInclude = _lodash2.default.toArray(passedInclude);
}