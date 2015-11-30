'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _lodashObjectKeys = require('lodash/object/keys');

var _lodashObjectKeys2 = _interopRequireDefault(_lodashObjectKeys);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _CollectionIndex = require('./CollectionIndex');

var _CollectionIndex2 = _interopRequireDefault(_CollectionIndex);

var _DocumentRetriver = require('./DocumentRetriver');

var _DocumentRetriver2 = _interopRequireDefault(_DocumentRetriver);

var _PromiseQueue = require('./PromiseQueue');

var _PromiseQueue2 = _interopRequireDefault(_PromiseQueue);

/**
 * Manager for controlling a list of indexes
 * for some model. Building indexes is promise
 * based.
 * By default it creates an index for `_id` field.
 */

var IndexManager = (function () {
  function IndexManager(db) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, IndexManager);

    this.db = db;
    this.indexes = {};
    this._queue = new _PromiseQueue2['default']({
      concurrency: options.concurrency || 2
    });

    // By default ensure index by _id field
    this.ensureIndex({
      fieldName: '_id',
      unique: true
    });
  }

  /**
   * Check index existance for given `options.fieldName` and
   * if index not exists it creates new one.
   * Always return a promise that resolved only when
   * index succesfully created, built and ready for working with.
   * If `options.forceRebuild` provided and equals to true then
   * existing index will be rebuilt, otherwise existing index
   * don't touched.
   *
   * @param  {Object} options.fieldName     name of the field for indexing
   * @param  {Object} options.forceRebuild  rebuild index if it exists
   * @return {Promise}
   */

  _createClass(IndexManager, [{
    key: 'ensureIndex',
    value: function ensureIndex(options) {
      (0, _invariant2['default'])(options && options.fieldName, 'You must specify a fieldName in options object');

      var key = options.fieldName;
      if (!this.indexes[key]) {
        this.indexes[key] = new _CollectionIndex2['default'](options);
        return this.buildIndex(key);
      } else if (this.indexes[key].buildPromise) {
        return this.indexes[key].buildPromise;
      } else if (options && options.forceRebuild) {
        return this.buildIndex(key);
      } else {
        return Promise.resolve();
      }
    }

    /**
     * Buld an existing index (ensured) and return a
     * promise that will be resolved only when index successfully
     * built for all documents in the storage.
     * @param  {String} key
     * @return {Promise}
     */
  }, {
    key: 'buildIndex',
    value: function buildIndex(key) {
      var _this = this;

      (0, _invariant2['default'])(this.indexes[key], 'Index with key `%s` does not ensured yet', key);

      var cleanup = function () {
        return _this.indexes[key].buildPromise = null;
      };
      var buildPromise = this._queue.push(this._doBuildIndex.bind(this, key), 10).then(cleanup, cleanup);

      this.indexes[key].buildPromise = buildPromise;
      return buildPromise;
    }

    /**
     * Schedule a task for each index in the
     * manager. Return promise that will be resolved
     * when all indexes is successfully built.
     * @return {Promise}
     */
  }, {
    key: 'buildAllIndexes',
    value: function buildAllIndexes() {
      var _this2 = this;

      return Promise.all((0, _lodashObjectKeys2['default'])(this.indexes).map(function (k) {
        return _this2.ensureIndex({
          fieldName: k,
          forceRebuild: true
        });
      }));
    }

    /**
     * Remove an index
     * @param  {String} key
     * @return {Promise}
     */
  }, {
    key: 'removeIndex',
    value: function removeIndex(key) {
      var _this3 = this;

      return this._queue.push(function (resolve, reject) {
        delete _this3.indexes[key];
        resolve();
      }, 10);
    }

    /**
     * Add a document to all indexes
     * @param  {Object} doc
     * @return {Promise}
     */
  }, {
    key: 'indexDocument',
    value: function indexDocument(doc) {
      var _this4 = this;

      return this._queue.push(function (resolve, reject) {
        var keys = (0, _lodashObjectKeys2['default'])(_this4.indexes);
        var failingIndex = null;
        try {
          keys.forEach(function (k, i) {
            failingIndex = i;
            _this4.indexes[k].insert(doc);
          });
          resolve();
        } catch (e) {
          keys.slice(0, failingIndex).forEach(function (k) {
            _this4.indexes[k].remove(doc);
          });
          reject(e);
        }
      }, 1);
    }

    /**
     * Update all indexes with new version of
     * the document
     * @param  {Object} oldDoc
     * @param  {Object} newDoc
     * @return {Promise}
     */
  }, {
    key: 'reindexDocument',
    value: function reindexDocument(oldDoc, newDoc) {
      var _this5 = this;

      return this._queue.push(function (resolve, reject) {
        var keys = (0, _lodashObjectKeys2['default'])(_this5.indexes);
        var failingIndex = null;
        try {
          keys.forEach(function (k, i) {
            failingIndex = i;
            _this5.indexes[k].update(oldDoc, newDoc);
          });
          resolve();
        } catch (e) {
          keys.slice(0, failingIndex).forEach(function (k) {
            _this5.indexes[k].revertUpdate(oldDoc, newDoc);
          });
          reject(e);
        }
      }, 1);
    }

    /**
     * Remove document from all indexes
     * @param  {Object} doc
     * @return {Promise}
     */
  }, {
    key: 'deindexDocument',
    value: function deindexDocument(doc) {
      var _this6 = this;

      return this._queue.push(function (resolve, reject) {
        var keys = (0, _lodashObjectKeys2['default'])(_this6.indexes);
        keys.forEach(function (k) {
          _this6.indexes[k].remove(doc);
        });
        resolve();
      }, 1);
    }

    /**
     * Build an existing index with reseting first
     * @param  {String} key
     * @return {Promise}
     */
  }, {
    key: '_doBuildIndex',
    value: function _doBuildIndex(key, resolve, reject) {
      // Get and reset index
      var index = this.indexes[key];
      index.reset();

      // Loop through all doucments in the storage
      var errors = [];
      new _DocumentRetriver2['default'](this.db).retriveAll().then(function (docs) {
        docs.forEach(function (doc) {
          try {
            index.insert(doc);
          } catch (e) {
            errors.push([e, doc]);
          }
        });

        if (errors.length) {
          resolve();
        } else {
          reject(errors);
        }
      });
    }
  }]);

  return IndexManager;
})();

exports.IndexManager = IndexManager;
exports['default'] = IndexManager;