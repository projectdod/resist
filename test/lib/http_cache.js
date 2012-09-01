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
  }
};
