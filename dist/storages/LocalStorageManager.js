'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var StorageManager = typeof window !== 'undefined' && window.Mars ? window.Mars.StorageManager : require('../StorageManager')['default'];
var EJSON = typeof window !== 'undefined' && window.Mars ? window.Mars.EJSON : require('../EJSON')['default'];

/**
 * LocalStorage storage implementation. It uses basic
 * in-memory StorageManager and sync all operations
 * with localStorage.
 */

var LocalStorageManager = (function (_StorageManager) {
  _inherits(LocalStorageManager, _StorageManager);

  function LocalStorageManager(db) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, LocalStorageManager);

    _get(Object.getPrototypeOf(LocalStorageManager.prototype), 'constructor', this).call(this, db, options);
  }

  _createClass(LocalStorageManager, [{
    key: 'destroy',
    value: function destroy() {
      var _this = this;

      return this._queue.push(function (resolve, reject) {
        Object.keys(_this._storage).forEach(function (key) {
          localStorage.removeItem(_this._makeStorageKey(key));
        });
        _get(Object.getPrototypeOf(LocalStorageManager.prototype), 'destroy', _this).call(_this).then(resolve, reject);
      });
    }
  }, {
    key: 'persist',
    value: function persist(key, value) {
      var _this2 = this;

      return _get(Object.getPrototypeOf(LocalStorageManager.prototype), 'persist', this).call(this, key, value).then(function () {
        return _this2._queue.push(function (resolve, reject) {
          localStorage.setItem(_this2._makeStorageKey(key), EJSON.stringify(value));
          resolve();
        });
      });
    }
  }, {
    key: 'delete',
    value: function _delete(key) {
      var _this3 = this;

      return _get(Object.getPrototypeOf(LocalStorageManager.prototype), 'delete', this).call(this, key).then(function () {
        return _this3._queue.push(function (resolve, reject) {
          localStorage.removeItem(_this3._makeStorageKey(key));
          resolve();
        });
      });
    }
  }, {
    key: '_makeStorageKey',
    value: function _makeStorageKey() {
      var key = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

      return 'mrs.' + this.db.modelName + '.' + key;
    }
  }, {
    key: '_loadStorage',
    value: function _loadStorage() {
      var _this4 = this;

      return this._queue.push(function (resolve, reject) {
        // Get keys of the collection
        var keyPrefix = _this4._makeStorageKey();
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var storageKey = localStorage.key(i);
          if (storageKey && storageKey.indexOf(keyPrefix) >= 0) {
            keys.push(storageKey);
          }
        }

        // Load data from storage
        keys.forEach(function (storageKey) {
          var item = localStorage.getItem(storageKey);
          if (item) {
            var doc = _this4.db.create(item);
            _this4._storage[doc._id] = doc;
          }
        });

        resolve();
      });
    }
  }]);

  return LocalStorageManager;
})(StorageManager);

exports['default'] = LocalStorageManager;
module.exports = exports['default'];