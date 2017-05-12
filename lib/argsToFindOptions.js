'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = argsToFindOptions;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _replaceWhereOperators = require('./replaceWhereOperators');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function argsToFindOptions(args, targetAttributes) {
  var result = {};

  if (args) {
    Object.keys(args).forEach(function (key) {
      if (~targetAttributes.indexOf(key)) {
        result.where = result.where || {};
        result.where[key] = args[key];
      }

      if (key === 'limit' && args[key]) {
        result.limit = parseInt(args[key], 10);
      }

      if (key === 'offset' && args[key]) {
        result.offset = parseInt(args[key], 10);
      }

      if (key === 'order' && args[key]) {
        if (args[key].indexOf('reverse:') === 0) {
          result.order = [[args[key].substring(8), 'DESC']];
        } else {
          result.order = [[args[key], 'ASC']];
        }
      }

      if (key === 'where' && args[key]) {
        // setup where
        result.where = (0, _replaceWhereOperators.replaceWhereOperators)(args.where);
      }

      if (key === 'include' && args[key]) {
        // setup where
        // args.include: [ { model: 'User', where: { name: [Object] } } ]
        result.include = _lodash2.default.map(args.include, function (includeObj) {
          // console.log('includeObj:', includeObj)
          includeObj.where = includeObj.where && (0, _replaceWhereOperators.replaceWhereOperators)(includeObj.where);
          return includeObj;
        });
      }
    });
  }

  return result;
}