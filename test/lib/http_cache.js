var HttpCache = require("../../lib/http_cache"),
    stub = require("../fixtures/stub");

function _set_up(callback) {
  this.backup = {};
  this.backup.jsonParse = JSON.parse;

  var cacheOptions = {
    "cache"        : {}
  };
  this.httpCache = new HttpCache(cacheOptions);

  callback();
}

function _tear_down(callback) {
  JSON.parse = this.backup.jsonParse;

  callback();
}

exports.http_cache = {
  setUp : _set_up,
  tearDown : _tear_down,
  'testing HttpCache module' : function (test) {
    test.expect(2);
    test.isNotNull(HttpCache);
    test.isFunction(HttpCache);
    test.done();
  },
  'should be object' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache);
    test.isObject(this.httpCache);
    test.done();
  },
  'should have get method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.get);
    test.isFunction(this.httpCache.get);
    test.done();
  },
  'should have set method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.set);
    test.isFunction(this.httpCache.set);
    test.done();
  },
  'should have update method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.update);
    test.isFunction(this.httpCache.update);
    test.done();
  },
  'should have setCleanMemory method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setCleanMemory);
    test.isFunction(this.httpCache.setCleanMemory);
    test.done();
  },
  'should have getVersion method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getVersion);
    test.isFunction(this.httpCache.getVersion);
    test.done();
  },
  'should have getVersionPrefix method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getVersionPrefix);
    test.isFunction(this.httpCache.getVersionPrefix);
    test.done();
  },
  'should have getMobilePrefix method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getMobilePrefix);
    test.isFunction(this.httpCache.getMobilePrefix);
    test.done();
  },
  'should have getCleanMemory method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getCleanMemory);
    test.isFunction(this.httpCache.getCleanMemory);
    test.done();
  },
  'should have setCode method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setCode);
    test.isFunction(this.httpCache.setCode);
    test.done();
  },
  'should have getCode method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getCode);
    test.isFunction(this.httpCache.getCode);
    test.done();
  },
  'should have setReason method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setReason);
    test.isFunction(this.httpCache.setReason);
    test.done();
  },
  'should have getReason method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getReason);
    test.isFunction(this.httpCache.getReason);
    test.done();
  },
  'should have setHeaders method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setHeaders);
    test.isFunction(this.httpCache.setHeaders);
    test.done();
  },
  'should have getHeaders method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getHeaders);
    test.isFunction(this.httpCache.getHeaders);
    test.done();
  },
  'should have setBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setBody);
    test.isFunction(this.httpCache.setBody);
    test.done();
  },
  'should have getBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getBody);
    test.isFunction(this.httpCache.getBody);
    test.done();
  },
  'should have getKeyPrefix method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getKeyPrefix);
    test.isFunction(this.httpCache.getKeyPrefix);
    test.done();
  },
  'should have setKeyPrefix method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setKeyPrefix);
    test.isFunction(this.httpCache.setKeyPrefix);
    test.done();
  },
  'should have getRequest method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getRequest);
    test.isFunction(this.httpCache.getRequest);
    test.done();
  },
  'should have setRequest method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setRequest);
    test.isFunction(this.httpCache.setRequest);
    test.done();
  },
  'should have getResponse method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getResponse);
    test.isFunction(this.httpCache.getResponse);
    test.done();
  },
  'should have setResponse method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setResponse);
    test.isFunction(this.httpCache.setResponse);
    test.done();
  },
  'should have buildKey method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.buildKey);
    test.isFunction(this.httpCache.buildKey);
    test.done();
  },
  'should have cacheOk method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.cacheOk);
    test.isFunction(this.httpCache.cacheOk);
    test.done();
  },
  'should have isStale method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.isStale);
    test.isFunction(this.httpCache.isStale);
    test.done();
  }
};
