import _isObject from 'lodash/lang/isObject';
import _isArray from 'lodash/lang/isArray';
import _has from 'lodash/object/has';
import _size from 'lodash/collection/size';
import {selectorIsId, selectorIsIdPerhapsAsObject} from './Document';


/**
 * Class for getting data objects by given list of ids.
 * Promises based. It makes requests asyncronousle by
 * getting request frame from database.
 * It's not use caches, because it's a task of store.
 * It just retrives content by 'get' method.
 */
export class DocumentRetriver {
  constructor(db) {
    this.db = db;
  }

  /**
   * Retrive an optimal superset of documents
   * by given query based on _id field of the query
   * @param  {Object} query
   * @return {Promise}
   */
  retriveForQeury(query) {
    // Try to get list of ids
    let selectorIds;
    if (selectorIsId(query)) {
      // fast path for scalar query
      selectorIds = [query];
    } else if (selectorIsIdPerhapsAsObject(query)) {
      // also do the fast path for { _id: idString }
      selectorIds = [query._id];
    } else if (
      _isObject(query) && _has(query, '_id') &&
      _isObject(query._id) && _has(query._id, '$in') &&
      _isArray(query._id.$in)
    ) {
      // and finally fast path for multiple ids
      // selected by $in operator
      selectorIds = query._id.$in;
    }

    // Retrive optimally
    if (_size(selectorIds) > 0) {
      return this.retriveIds(selectorIds);
    } else {
      return this.retriveAll();
    }
  }

  /**
   * Retrive all documents in the storage of
   * the collection
   * @return {Promise}
   */
  retriveAll() {
    return new Promise((resolve, reject) => {
      const result = [];
      this.db.storage.createReadStream()
        .on('data', (data) => result.push(this.db.create(data.value)))
        .on('end', () => resolve(result));
    });
  }

  /**
   * Rterive all ids given in constructor.
   * If some id is not retrived (retrived qith error),
   * then returned promise will be rejected with that error.
   * @return {Promise}
   */
  retriveIds(ids) {
    const retrPromises = ids.map(id => this.retriveOne(id));
    return Promise.all(retrPromises);
  }

  /**
   * Retrive one document by given id
   * @param  {String} id
   * @return {Promise}
   */
  retriveOne(id) {
    return this.db.storage.get(id).then((buf) => this.db.create(buf));
  }
}

export default DocumentRetriver;