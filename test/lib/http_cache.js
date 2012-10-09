var HttpCache = require("../../lib/http_cache"),
    stub = require("../fixtures/stub");

function _set_up(callback) {
  this.backup = {};
  this.backup.jsonParse = JSON.parse;

  this.version = 1;

  this.req = {
    "url"         : "/foo",
    "httpVersion" : "1.1",
    "method"      : "GET",
    "user-agent"  : "iPhone",
    "headers"     : {
      "host"          : "dod.net",
      "cache-control" : "yammer",
      "cookie"        : "some_cookie"
    }
  };

  this.res = {
    "statusCode"  : "200",
    "headers"     : {
      "host"          : "dod.net",
      "cache-control" : "yammer",
      "cookie"        : "some_cookie"
    }
  };

  this.res.getHeader = function (key) {
    return this.res.headers.key;
  }.bind(this);

  var cacheOptions = {
    "type" : "local"
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
  'should have default data set' : function (test) {
    test.expect(14);
    test.isNotNull(this.httpCache.options);
    test.equal(this.httpCache.keyPrefix, 'v' + this.version + ':');
    test.equal(this.httpCache.debug, 0);
    test.equal(this.httpCache.cleanMemory, 3600);
    test.equal(this.httpCache.type, 'local');
    test.equal(this.httpCache.timeout, 300 * 1000);
    test.equal(this.httpCache.cacheHost, "127.0.0.1");
    test.equal(this.httpCache.cachePort, "6379");
    test.equal(this.httpCache.timestamp, 0);
    test.isArray(this.httpCache.body);
    test.equal(this.httpCache.body.length, 0);
    test.isObject(this.httpCache.cache);
    test.isObject(this.httpCache.cacheNodes);
    test.isUndefined(this.httpCache.redis);
    test.done();
  },
  'should have get method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.get);
    test.isFunction(this.httpCache.get);
    test.done();
  },
  'get method should return nothing' : function (test) {
    test.expect(1);
    this.httpCache.get(this.req, function (cache) {
      test.isUndefined(cache);
      test.done();
    });
  },
  'should have set method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.set);
    test.isFunction(this.httpCache.set);
    test.done();
  },
  'set/update method should set data available through get' : function (test) {
    var self = this;
    test.expect(6);
    this.httpCache.setRequest(this.req);
    this.httpCache.setCode(this.res.statusCode);
    this.httpCache.setHeaders(this.res.headers);
    this.httpCache.setCleanMemory(0);
    this.httpCache.set(this.res);
    this.httpCache.get(this.req, function (cache) {
      test.isObject(cache);
      test.equal(cache.getCode(), 200);
      test.deepEqual(cache.getHeaders(), self.res.headers);
      self.httpCache.setCode(203);
      self.httpCache.update();
      self.httpCache.get(self.req, function (newCache) {
        test.isObject(newCache);
        test.equal(newCache.getCode(), 203);
        test.deepEqual(newCache.getHeaders(), self.res.headers);
        test.done();
      });
    });
  },
  'should have update method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.update);
    test.isFunction(this.httpCache.update);
    test.done();
  },
  'should have getVersion method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getVersion);
    test.isFunction(this.httpCache.getVersion);
    test.done();
  },
  'getVersion should return correct value' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getVersion);
    test.equal(this.httpCache.getVersion(), 1);
    test.done();
  },
  'should have getVersionPrefix method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getVersionPrefix);
    test.isFunction(this.httpCache.getVersionPrefix);
    test.done();
  },
  'getVersionPrefix should return correct value' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getVersionPrefix);
    test.equal(this.httpCache.getVersionPrefix(),
      "v" + this.httpCache.getVersion() + ":");
    test.done();
  },
  'should have getMobilePrefix method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getMobilePrefix);
    test.isFunction(this.httpCache.getMobilePrefix);
    test.done();
  },
  'getMobilePrefix should return correct value' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getMobilePrefix);
    test.equal(this.httpCache.getMobilePrefix(), "m:");
    test.done();
  },
  'should have getCleanMemory method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getCleanMemory);
    test.isFunction(this.httpCache.getCleanMemory);
    test.done();
  },
  'getCleanMemory should return default no options' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getCleanMemory);
    // Though it was better to test the default value by hand here
    test.equal(this.httpCache.getCleanMemory(), 3600);
    test.done();
  },
  'should have setCleanMemory method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setCleanMemory);
    test.isFunction(this.httpCache.setCleanMemory);
    test.done();
  },
  'getCleanMemory should return option from constructor' : function (test) {
    test.expect(3);
    var cacheOptions = {
      "type"        : "local",
      "cleanMemory" : 5
    };
    this.httpCache = new HttpCache(cacheOptions);
    test.isNotNull(this.httpCache);
    test.isNotNull(this.httpCache.getCleanMemory);
    test.equal(this.httpCache.getCleanMemory(), 5);
    test.done();
  },
  'setCleanMemory should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.httpCache.getCleanMemory);
    test.isNotNull(this.httpCache.setCleanMemory);
    test.equal(this.httpCache.getCleanMemory(), 3600);
    this.httpCache.setCleanMemory(5);
    test.equal(this.httpCache.getCleanMemory(), 5);
    test.done();
  },
  'should have getCode method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getCode);
    test.isFunction(this.httpCache.getCode);
    test.done();
  },
  'getCode will be undef if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getCode);
    test.isUndefined(this.httpCache.getCode());
    test.done();
  },
  'should have setCode method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setCode);
    test.isFunction(this.httpCache.setCode);
    test.done();
  },
  'setCode should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.httpCache.getCode);
    test.isNotNull(this.httpCache.setCode);
    test.isUndefined(this.httpCache.getCode());
    this.httpCache.setCode(200);
    test.equal(this.httpCache.getCode(), 200);
    test.done();
  },
  'should have getReason method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getReason);
    test.isFunction(this.httpCache.getReason);
    test.done();
  },
  'getReason will be undef if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getReason);
    test.isUndefined(this.httpCache.getReason());
    test.done();
  },
  'should have setReason method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setReason);
    test.isFunction(this.httpCache.setReason);
    test.done();
  },
  'setReason should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.httpCache.getReason);
    test.isNotNull(this.httpCache.setReason);
    test.isUndefined(this.httpCache.getReason());
    this.httpCache.setReason("This is OK");
    test.equal(this.httpCache.getReason(), "This is OK");
    test.done();
  },
  'should have getHeaders method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getHeaders);
    test.isFunction(this.httpCache.getHeaders);
    test.done();
  },
  'getHeaders will be undef if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getHeaders);
    test.isUndefined(this.httpCache.getHeaders());
    test.done();
  },
  'should have setHeaders method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setHeaders);
    test.isFunction(this.httpCache.setHeaders);
    test.done();
  },
  'setHeaders should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.httpCache.getHeaders);
    test.isNotNull(this.httpCache.setHeaders);
    test.isUndefined(this.httpCache.getHeaders());
    this.httpCache.setHeaders({ 'cache-control' : 'test' });
    test.deepEqual(this.httpCache.getHeaders(), { 'cache-control' : 'test' });
    test.done();
  },
  'should have getMaxBodySize method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getMaxBodySize);
    test.isFunction(this.httpCache.getMaxBodySize);
    test.done();
  },
  'getMaxBodySize will be default if not set' : function (test) {
    test.expect(3);
    test.isNotNull(this.httpCache.getMaxBodySize);
    test.isNotNull(this.httpCache.getMaxBodySize());
    test.equal(this.httpCache.getMaxBodySize(), 26214400);
    test.done();
  },
  'should have setMaxBodySize method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setMaxBodySize);
    test.isFunction(this.httpCache.setMaxBodySize);
    test.done();
  },
  'setMaxBodySize should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.httpCache.getMaxBodySize);
    test.isNotNull(this.httpCache.setMaxBodySize);
    test.isNotNull(this.httpCache.getMaxBodySize());
    this.httpCache.setMaxBodySize(1024);
    test.equal(this.httpCache.getMaxBodySize(), 1024);
    test.done();
  },
  'should have getBodySize method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getBodySize);
    test.isFunction(this.httpCache.getBodySize);
    test.done();
  },
  'getBodySize will be default if not set' : function (test) {
    test.expect(3);
    test.isNotNull(this.httpCache.getBodySize);
    test.isNotNull(this.httpCache.getBodySize());
    test.equal(this.httpCache.getBodySize(), 0);
    test.done();
  },
  'should have setBodySize method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setBodySize);
    test.isFunction(this.httpCache.setBodySize);
    test.done();
  },
  'setBodySize should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.httpCache.getBodySize);
    test.isNotNull(this.httpCache.setBodySize);
    test.isNotNull(this.httpCache.getBodySize());
    this.httpCache.setBodySize(1024);
    test.equal(this.httpCache.getBodySize(), 1024);
    test.done();
  },
  'should have getBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getBody);
    test.isFunction(this.httpCache.getBody);
    test.done();
  },
  'getBody will be an empty Buffer if not set' : function (test) {
    test.expect(3);
    test.isNotNull(this.httpCache.getBody);
    test.isBuffer(this.httpCache.getBody());
    test.equal(this.httpCache.getBody().length, 0);
    test.done();
  },
  'should have setBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setBody);
    test.isFunction(this.httpCache.setBody);
    test.done();
  },
  'setBody should actually set value in object' : function (test) {
    test.expect(6);
    test.isNotNull(this.httpCache.getBody);
    test.isNotNull(this.httpCache.setBody);
    test.isBuffer(this.httpCache.getBody());
    test.equal(this.httpCache.getBody().length, 0);
    var test1 = new Buffer("test1");
    this.httpCache.setBody(test1);
    test.equal(this.httpCache.getBody().toString(), test1.toString());
    var test2 = new Buffer("test2");
    this.httpCache.setBody(test2);
    test.equal(this.httpCache.getBody().toString(),
      test1.toString() + test2.toString());
    test.done();
  },
  'should have clearBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.clearBody);
    test.isFunction(this.httpCache.clearBody);
    test.done();
  },
  'clearBody should actually clear set value in object' : function (test) {
    test.expect(7);
    test.isNotNull(this.httpCache.getBody);
    test.isNotNull(this.httpCache.setBody);
    test.isNotNull(this.httpCache.clearBody);
    test.isBuffer(this.httpCache.getBody());
    test.equal(this.httpCache.getBody().length, 0);
    var test1 = new Buffer("test1");
    this.httpCache.setBody(test1);
    test.equal(this.httpCache.getBody().toString(), test1.toString());
    this.httpCache.clearBody();
    test.equal(this.httpCache.getBody().length, 0);
    test.done();
  },
  'should have getEncodedBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getEncodedBody);
    test.isFunction(this.httpCache.getEncodedBody);
    test.done();
  },
  'getEncodedBody will be undef if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getEncodedBody);
    test.isUndefined(this.httpCache.getEncodedBody());
    test.done();
  },
  'should have setEncodedBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setEncodedBody);
    test.isFunction(this.httpCache.setEncodedBody);
    test.done();
  },
  'setEncodedBody should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.httpCache.getEncodedBody);
    test.isNotNull(this.httpCache.setEncodedBody);
    test.isUndefined(this.httpCache.getEncodedBody());
    this.httpCache.setEncodedBody('{"body":"test"}');
    test.equal(this.httpCache.getEncodedBody(), '{"body":"test"}');
    test.done();
  },
  'should have getTimestamp method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getTimestamp);
    test.isFunction(this.httpCache.getTimestamp);
    test.done();
  },
  'getTimestamp will be zero if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getTimestamp);
    test.equal(this.httpCache.getTimestamp(), 0);
    test.done();
  },
  'should have setTimestamp method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setTimestamp);
    test.isFunction(this.httpCache.setTimestamp);
    test.done();
  },
  'setTimestamp should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.httpCache.getTimestamp);
    test.isNotNull(this.httpCache.setTimestamp);
    test.equal(this.httpCache.getTimestamp(), 0);
    var date = new Date();
    var dateTest = date.getTime();
    this.httpCache.setTimestamp(dateTest);
    test.equal(this.httpCache.getTimestamp(), dateTest);
    test.done();
  },
  'should have getKeyPrefix method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getKeyPrefix);
    test.isFunction(this.httpCache.getKeyPrefix);
    test.done();
  },
  'getKeyPrefix will be getVersionPrefix if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getKeyPrefix);
    test.equal(this.httpCache.getKeyPrefix(),
      this.httpCache.getVersionPrefix());
    test.done();
  },
  'should have setKeyPrefix method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setKeyPrefix);
    test.isFunction(this.httpCache.setKeyPrefix);
    test.done();
  },
  'setKeyPrefix should actually set value in object' : function (test) {
    test.expect(5);
    test.isNotNull(this.httpCache.getVersionPrefix);
    test.isNotNull(this.httpCache.getKeyPrefix);
    test.isNotNull(this.httpCache.setKeyPrefix);
    test.equal(this.httpCache.getKeyPrefix(),
      this.httpCache.getVersionPrefix());
    this.httpCache.setKeyPrefix("test");
    test.equal(this.httpCache.getKeyPrefix(), "test");
    test.done();
  },
  'should have getRequest method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getRequest);
    test.isFunction(this.httpCache.getRequest);
    test.done();
  },
  'getRequest will be undef if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getRequest);
    test.isUndefined(this.httpCache.getRequest());
    test.done();
  },
  'should have setRequest method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setRequest);
    test.isFunction(this.httpCache.setRequest);
    test.done();
  },
  'setRequest should actually set value in object' : function (test) {
    test.expect(10);
    test.isNotNull(this.httpCache.getKeyPrefix);
    test.isNotNull(this.httpCache.getVersionPrefix);
    test.isNotNull(this.httpCache.getMobilePrefix);
    test.isNotNull(this.httpCache.getRequest);
    test.isNotNull(this.httpCache.setRequest);
    test.isUndefined(this.httpCache.getRequest());
    var testObject = new Object();
    testObject.headers = {
      "user-agent" : "testing"
    };
    this.httpCache.setRequest(testObject);
    test.equal(this.httpCache.getRequest(), testObject);
    test.equal(this.httpCache.getKeyPrefix(),
      this.httpCache.getVersionPrefix());
    testObject.headers = {
      "user-agent" : "iPhone"
    };
    this.httpCache.setRequest(testObject);
    test.equal(this.httpCache.getRequest(), testObject);
    test.equal(this.httpCache.getKeyPrefix(),
      this.httpCache.getVersionPrefix() + this.httpCache.getMobilePrefix());
    test.done();
  },
  'should have getResponse method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getResponse);
    test.isFunction(this.httpCache.getResponse);
    test.done();
  },
  'getResponse will be undef if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getResponse);
    test.isUndefined(this.httpCache.getResponse());
    test.done();
  },
  'should have setResponse method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setResponse);
    test.isFunction(this.httpCache.setResponse);
    test.done();
  },
  'setResponse should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.httpCache.getResponse);
    test.isNotNull(this.httpCache.setResponse);
    test.isUndefined(this.httpCache.getResponse());
    var testObject = new Object();
    this.httpCache.setResponse(testObject);
    test.equal(this.httpCache.getResponse(), testObject);
    test.done();
  },
  'should have getDebug method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getDebug);
    test.isFunction(this.httpCache.getDebug);
    test.done();
  },
  'getDebug will be 0 if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.getDebug);
    test.equal(this.httpCache.getDebug(), 0);
    test.done();
  },
  'should have setDebug method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.setDebug);
    test.isFunction(this.httpCache.setDebug);
    test.done();
  },
  'setDebug should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.httpCache.getDebug);
    test.isNotNull(this.httpCache.setDebug);
    test.equal(this.httpCache.getDebug(), 0);
    this.httpCache.setDebug(1);
    test.equal(this.httpCache.getDebug(), 1);
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
  },
  'should have encodeBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.encodeBody);
    test.isFunction(this.httpCache.encodeBody);
    test.done();
  },
  'should have decodeBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.decodeBody);
    test.isFunction(this.httpCache.decodeBody);
    test.done();
  },
  'should have mergeHeaders method' : function (test) {
    test.expect(2);
    test.isNotNull(this.httpCache.mergeHeaders);
    test.isFunction(this.httpCache.mergeHeaders);
    test.done();
  }
};
