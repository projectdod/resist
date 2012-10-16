var ResistCache = require("../../lib/resist_cache"),
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
      "some" : "data"
    }
  };

  this.res.getHeader = function (key) {
    return this.res.headers.key;
  }.bind(this);

  var cacheOptions = {
    "type" : "local"
  };
  this.resistCache = new ResistCache(cacheOptions);

  callback();
}

function _tear_down(callback) {
  JSON.parse = this.backup.jsonParse;

  callback();
}

exports.resist_cache = {
  setUp : _set_up,
  tearDown : _tear_down,
  'testing ResistCache module' : function (test) {
    test.expect(2);
    test.isNotNull(ResistCache);
    test.isFunction(ResistCache);
    test.done();
  },
  'should be object' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache);
    test.isObject(this.resistCache);
    test.done();
  },
  'should have default data set' : function (test) {
    test.expect(14);
    test.isNotNull(this.resistCache.options);
    test.equal(this.resistCache.keyPrefix, 'v' + this.version + ':');
    test.equal(this.resistCache.debug, 0);
    test.equal(this.resistCache.cleanMemory, 3600);
    test.equal(this.resistCache.type, 'local');
    test.equal(this.resistCache.timeout, 300 * 1000);
    test.equal(this.resistCache.cacheHost, "127.0.0.1");
    test.equal(this.resistCache.cachePort, "6379");
    test.equal(this.resistCache.timestamp, 0);
    test.isArray(this.resistCache.body);
    test.equal(this.resistCache.body.length, 0);
    test.isObject(this.resistCache.cache);
    test.isObject(this.resistCache.cacheNodes);
    test.isUndefined(this.resistCache.redis);
    test.done();
  },
  'should have get method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.get);
    test.isFunction(this.resistCache.get);
    test.done();
  },
  'get method should return nothing' : function (test) {
    test.expect(1);
    this.resistCache.get(this.req, function (cache) {
      test.isUndefined(cache);
      test.done();
    });
  },
  'should have set method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.set);
    test.isFunction(this.resistCache.set);
    test.done();
  },
  'set/update method should set data available through get' : function (test) {
    var self = this;
    test.expect(6);
    this.resistCache.setRequest(this.req);
    this.resistCache.setCode(this.res.statusCode);
    this.resistCache.setHeaders(this.res.headers);
    this.resistCache.setCleanMemory(0);
    this.resistCache.set(this.res);
    this.resistCache.get(this.req, function (cache) {
      test.isObject(cache);
      test.equal(cache.getCode(), 200);
      test.deepEqual(cache.getHeaders(), self.res.headers);
      self.resistCache.setCode(203);
      self.resistCache.update();
      self.resistCache.get(self.req, function (newCache) {
        test.isObject(newCache);
        test.equal(newCache.getCode(), 203);
        test.deepEqual(newCache.getHeaders(), self.res.headers);
        test.done();
      });
    });
  },
  'should have update method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.update);
    test.isFunction(this.resistCache.update);
    test.done();
  },
  'should have getVersion method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getVersion);
    test.isFunction(this.resistCache.getVersion);
    test.done();
  },
  'getVersion should return correct value' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getVersion);
    test.equal(this.resistCache.getVersion(), 1);
    test.done();
  },
  'should have getVersionPrefix method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getVersionPrefix);
    test.isFunction(this.resistCache.getVersionPrefix);
    test.done();
  },
  'getVersionPrefix should return correct value' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getVersionPrefix);
    test.equal(this.resistCache.getVersionPrefix(),
      "v" + this.resistCache.getVersion() + ":");
    test.done();
  },
  'should have getMobilePrefix method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getMobilePrefix);
    test.isFunction(this.resistCache.getMobilePrefix);
    test.done();
  },
  'getMobilePrefix should return correct value' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getMobilePrefix);
    test.equal(this.resistCache.getMobilePrefix(), "m:");
    test.done();
  },
  'should have getCleanMemory method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getCleanMemory);
    test.isFunction(this.resistCache.getCleanMemory);
    test.done();
  },
  'getCleanMemory should return default no options' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getCleanMemory);
    // Though it was better to test the default value by hand here
    test.equal(this.resistCache.getCleanMemory(), 3600);
    test.done();
  },
  'should have setCleanMemory method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.setCleanMemory);
    test.isFunction(this.resistCache.setCleanMemory);
    test.done();
  },
  'getCleanMemory should return option from constructor' : function (test) {
    test.expect(3);
    var cacheOptions = {
      "type"        : "local",
      "cleanMemory" : 5
    };
    this.resistCache = new ResistCache(cacheOptions);
    test.isNotNull(this.resistCache);
    test.isNotNull(this.resistCache.getCleanMemory);
    test.equal(this.resistCache.getCleanMemory(), 5);
    test.done();
  },
  'setCleanMemory should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.resistCache.getCleanMemory);
    test.isNotNull(this.resistCache.setCleanMemory);
    test.equal(this.resistCache.getCleanMemory(), 3600);
    this.resistCache.setCleanMemory(5);
    test.equal(this.resistCache.getCleanMemory(), 5);
    test.done();
  },
  'should have getCode method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getCode);
    test.isFunction(this.resistCache.getCode);
    test.done();
  },
  'getCode will be undef if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getCode);
    test.isUndefined(this.resistCache.getCode());
    test.done();
  },
  'should have setCode method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.setCode);
    test.isFunction(this.resistCache.setCode);
    test.done();
  },
  'setCode should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.resistCache.getCode);
    test.isNotNull(this.resistCache.setCode);
    test.isUndefined(this.resistCache.getCode());
    this.resistCache.setCode(200);
    test.equal(this.resistCache.getCode(), 200);
    test.done();
  },
  'should have getReason method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getReason);
    test.isFunction(this.resistCache.getReason);
    test.done();
  },
  'getReason will be undef if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getReason);
    test.isUndefined(this.resistCache.getReason());
    test.done();
  },
  'should have setReason method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.setReason);
    test.isFunction(this.resistCache.setReason);
    test.done();
  },
  'setReason should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.resistCache.getReason);
    test.isNotNull(this.resistCache.setReason);
    test.isUndefined(this.resistCache.getReason());
    this.resistCache.setReason("This is OK");
    test.equal(this.resistCache.getReason(), "This is OK");
    test.done();
  },
  'should have getHeaders method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getHeaders);
    test.isFunction(this.resistCache.getHeaders);
    test.done();
  },
  'getHeaders will be undef if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getHeaders);
    test.isUndefined(this.resistCache.getHeaders());
    test.done();
  },
  'should have setHeaders method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.setHeaders);
    test.isFunction(this.resistCache.setHeaders);
    test.done();
  },
  'setHeaders should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.resistCache.getHeaders);
    test.isNotNull(this.resistCache.setHeaders);
    test.isUndefined(this.resistCache.getHeaders());
    this.resistCache.setHeaders({ 'cache-control' : 'test' });
    test.deepEqual(this.resistCache.getHeaders(), { 'cache-control' : 'test' });
    test.done();
  },
  'should have getMaxBodySize method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getMaxBodySize);
    test.isFunction(this.resistCache.getMaxBodySize);
    test.done();
  },
  'getMaxBodySize will be default if not set' : function (test) {
    test.expect(3);
    test.isNotNull(this.resistCache.getMaxBodySize);
    test.isNotNull(this.resistCache.getMaxBodySize());
    test.equal(this.resistCache.getMaxBodySize(), 26214400);
    test.done();
  },
  'should have setMaxBodySize method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.setMaxBodySize);
    test.isFunction(this.resistCache.setMaxBodySize);
    test.done();
  },
  'setMaxBodySize should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.resistCache.getMaxBodySize);
    test.isNotNull(this.resistCache.setMaxBodySize);
    test.isNotNull(this.resistCache.getMaxBodySize());
    this.resistCache.setMaxBodySize(1024);
    test.equal(this.resistCache.getMaxBodySize(), 1024);
    test.done();
  },
  'should have getBodySize method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getBodySize);
    test.isFunction(this.resistCache.getBodySize);
    test.done();
  },
  'getBodySize will be default if not set' : function (test) {
    test.expect(3);
    test.isNotNull(this.resistCache.getBodySize);
    test.isNotNull(this.resistCache.getBodySize());
    test.equal(this.resistCache.getBodySize(), 0);
    test.done();
  },
  'should have setBodySize method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.setBodySize);
    test.isFunction(this.resistCache.setBodySize);
    test.done();
  },
  'setBodySize should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.resistCache.getBodySize);
    test.isNotNull(this.resistCache.setBodySize);
    test.isNotNull(this.resistCache.getBodySize());
    this.resistCache.setBodySize(1024);
    test.equal(this.resistCache.getBodySize(), 1024);
    test.done();
  },
  'should have getBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getBody);
    test.isFunction(this.resistCache.getBody);
    test.done();
  },
  'getBody will be an empty Buffer if not set' : function (test) {
    test.expect(3);
    test.isNotNull(this.resistCache.getBody);
    test.isBuffer(this.resistCache.getBody());
    test.equal(this.resistCache.getBody().length, 0);
    test.done();
  },
  'should have setBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.setBody);
    test.isFunction(this.resistCache.setBody);
    test.done();
  },
  'setBody should actually set value in object' : function (test) {
    test.expect(6);
    test.isNotNull(this.resistCache.getBody);
    test.isNotNull(this.resistCache.setBody);
    test.isBuffer(this.resistCache.getBody());
    test.equal(this.resistCache.getBody().length, 0);
    var test1 = new Buffer("test1");
    this.resistCache.setBody(test1);
    test.equal(this.resistCache.getBody().toString(), test1.toString());
    var test2 = new Buffer("test2");
    this.resistCache.setBody(test2);
    test.equal(this.resistCache.getBody().toString(),
      test1.toString() + test2.toString());
    test.done();
  },
  'should have clearBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.clearBody);
    test.isFunction(this.resistCache.clearBody);
    test.done();
  },
  'clearBody should actually clear set value in object' : function (test) {
    test.expect(7);
    test.isNotNull(this.resistCache.getBody);
    test.isNotNull(this.resistCache.setBody);
    test.isNotNull(this.resistCache.clearBody);
    test.isBuffer(this.resistCache.getBody());
    test.equal(this.resistCache.getBody().length, 0);
    var test1 = new Buffer("test1");
    this.resistCache.setBody(test1);
    test.equal(this.resistCache.getBody().toString(), test1.toString());
    this.resistCache.clearBody();
    test.equal(this.resistCache.getBody().length, 0);
    test.done();
  },
  'should have getEncodedBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getEncodedBody);
    test.isFunction(this.resistCache.getEncodedBody);
    test.done();
  },
  'getEncodedBody will be undef if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getEncodedBody);
    test.isUndefined(this.resistCache.getEncodedBody());
    test.done();
  },
  'should have setEncodedBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.setEncodedBody);
    test.isFunction(this.resistCache.setEncodedBody);
    test.done();
  },
  'setEncodedBody should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.resistCache.getEncodedBody);
    test.isNotNull(this.resistCache.setEncodedBody);
    test.isUndefined(this.resistCache.getEncodedBody());
    this.resistCache.setEncodedBody('{"body":"test"}');
    test.equal(this.resistCache.getEncodedBody(), '{"body":"test"}');
    test.done();
  },
  'should have getTimestamp method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getTimestamp);
    test.isFunction(this.resistCache.getTimestamp);
    test.done();
  },
  'getTimestamp will be zero if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getTimestamp);
    test.equal(this.resistCache.getTimestamp(), 0);
    test.done();
  },
  'should have setTimestamp method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.setTimestamp);
    test.isFunction(this.resistCache.setTimestamp);
    test.done();
  },
  'setTimestamp should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.resistCache.getTimestamp);
    test.isNotNull(this.resistCache.setTimestamp);
    test.equal(this.resistCache.getTimestamp(), 0);
    var date = new Date();
    var dateTest = date.getTime();
    this.resistCache.setTimestamp(dateTest);
    test.equal(this.resistCache.getTimestamp(), dateTest);
    test.done();
  },
  'should have getKeyPrefix method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getKeyPrefix);
    test.isFunction(this.resistCache.getKeyPrefix);
    test.done();
  },
  'getKeyPrefix will be getVersionPrefix if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getKeyPrefix);
    test.equal(this.resistCache.getKeyPrefix(),
      this.resistCache.getVersionPrefix());
    test.done();
  },
  'should have setKeyPrefix method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.setKeyPrefix);
    test.isFunction(this.resistCache.setKeyPrefix);
    test.done();
  },
  'setKeyPrefix should actually set value in object' : function (test) {
    test.expect(5);
    test.isNotNull(this.resistCache.getVersionPrefix);
    test.isNotNull(this.resistCache.getKeyPrefix);
    test.isNotNull(this.resistCache.setKeyPrefix);
    test.equal(this.resistCache.getKeyPrefix(),
      this.resistCache.getVersionPrefix());
    this.resistCache.setKeyPrefix("test");
    test.equal(this.resistCache.getKeyPrefix(), "test");
    test.done();
  },
  'should have getRequest method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getRequest);
    test.isFunction(this.resistCache.getRequest);
    test.done();
  },
  'getRequest will be undef if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getRequest);
    test.isUndefined(this.resistCache.getRequest());
    test.done();
  },
  'should have setRequest method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.setRequest);
    test.isFunction(this.resistCache.setRequest);
    test.done();
  },
  'setRequest should actually set value in object' : function (test) {
    test.expect(10);
    test.isNotNull(this.resistCache.getKeyPrefix);
    test.isNotNull(this.resistCache.getVersionPrefix);
    test.isNotNull(this.resistCache.getMobilePrefix);
    test.isNotNull(this.resistCache.getRequest);
    test.isNotNull(this.resistCache.setRequest);
    test.isUndefined(this.resistCache.getRequest());
    var testObject = new Object();
    testObject.headers = {
      "user-agent" : "testing"
    };
    this.resistCache.setRequest(testObject);
    test.equal(this.resistCache.getRequest(), testObject);
    test.equal(this.resistCache.getKeyPrefix(),
      this.resistCache.getVersionPrefix());
    testObject.headers = {
      "user-agent" : "iPhone"
    };
    this.resistCache.setRequest(testObject);
    test.equal(this.resistCache.getRequest(), testObject);
    test.equal(this.resistCache.getKeyPrefix(),
      this.resistCache.getVersionPrefix() + this.resistCache.getMobilePrefix());
    test.done();
  },
  'should have getResponse method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getResponse);
    test.isFunction(this.resistCache.getResponse);
    test.done();
  },
  'getResponse will be undef if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getResponse);
    test.isUndefined(this.resistCache.getResponse());
    test.done();
  },
  'should have setResponse method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.setResponse);
    test.isFunction(this.resistCache.setResponse);
    test.done();
  },
  'setResponse should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.resistCache.getResponse);
    test.isNotNull(this.resistCache.setResponse);
    test.isUndefined(this.resistCache.getResponse());
    var testObject = new Object();
    this.resistCache.setResponse(testObject);
    test.equal(this.resistCache.getResponse(), testObject);
    test.done();
  },
  'should have getDebug method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getDebug);
    test.isFunction(this.resistCache.getDebug);
    test.done();
  },
  'getDebug will be 0 if not set' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.getDebug);
    test.equal(this.resistCache.getDebug(), 0);
    test.done();
  },
  'should have setDebug method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.setDebug);
    test.isFunction(this.resistCache.setDebug);
    test.done();
  },
  'setDebug should actually set value in object' : function (test) {
    test.expect(4);
    test.isNotNull(this.resistCache.getDebug);
    test.isNotNull(this.resistCache.setDebug);
    test.equal(this.resistCache.getDebug(), 0);
    this.resistCache.setDebug(1);
    test.equal(this.resistCache.getDebug(), 1);
    test.done();
  },
  'should have buildKey method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.buildKey);
    test.isFunction(this.resistCache.buildKey);
    test.done();
  },
  'buildKey should have a default and be mutable' : function (test) {
    test.expect(6);
    this.resistCache.setRequest(this.req);
    test.equal(this.resistCache.buildKey(), "v1:GET:1.1:dod.net:/foo");
    this.resistCache.setKeyPrefix("testing:")
    test.equal(this.resistCache.buildKey(), "testing:GET:1.1:dod.net:/foo");
    this.req.method = "POST";
    this.resistCache.setRequest(this.req);
    test.equal(this.resistCache.buildKey(), "v1:POST:1.1:dod.net:/foo");
    this.req.httpVersion = "1.0";
    this.resistCache.setRequest(this.req);
    test.equal(this.resistCache.buildKey(), "v1:POST:1.0:dod.net:/foo");
    this.req.headers.host = "test.com";
    this.resistCache.setRequest(this.req);
    test.equal(this.resistCache.buildKey(), "v1:POST:1.0:test.com:/foo");
    this.req.url = "/test01";
    this.resistCache.setRequest(this.req);
    test.equal(this.resistCache.buildKey(), "v1:POST:1.0:test.com:/test01");
    test.done();
  },
  'should have cacheOk method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.cacheOk);
    test.isFunction(this.resistCache.cacheOk);
    test.done();
  },
  'should have isStale method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.isStale);
    test.isFunction(this.resistCache.isStale);
    test.done();
  },
  'should have encodeBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.encodeBody);
    test.isFunction(this.resistCache.encodeBody);
    test.done();
  },
  'should have decodeBody method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.decodeBody);
    test.isFunction(this.resistCache.decodeBody);
    test.done();
  },
  'encodeBody/decodeBody should work together' : function (test) {
    test.expect(3);
    var buff = new Buffer("testing");
    var result = this.resistCache.encodeBody(buff);
    test.isString(result);
    var testBuffer = this.resistCache.decodeBody(result);
    test.isBuffer(testBuffer);
    test.equal(buff.toString(), testBuffer.toString());
    test.done();
  },
  'should have mergeHeaders method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCache.mergeHeaders);
    test.isFunction(this.resistCache.mergeHeaders);
    test.done();
  },
  'mergeHeaders should, you know, merge headers' : function (test) {
    test.expect(2);
    var newHeaders = {
      "more" : "data"
    };
    var expectHeaders = {
      "some" : "data",
      "more" : "data"
    };
    this.resistCache.setHeaders(this.res.headers);
    test.deepEqual(this.resistCache.getHeaders(), this.res.headers);
    this.resistCache.mergeHeaders(newHeaders);
    test.deepEqual(this.resistCache.getHeaders(), expectHeaders);
    test.done();
  }
};
