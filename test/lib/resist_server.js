var ResistServer = require("../../lib/resist_server"),
    ResistConfig = require("../../lib/resist_config"),
    ResistCache  = require("../fixtures/resist_cache");
    stub         = require("../fixtures/stub");

function _set_up(callback) {
  var self = this;

  this.backup = {};
  this.backup.jsonParse = JSON.parse;

  var resistConfigOptions = {
    "port"           : 24401,                 // local port
    "cache_timeout"  : 300,                   // seconds
    "cache_purge"    : 3600,                  // sec before local memory purge
    "cache_type"     : 'local',               // type of cache
    "cache_nodes"    : {                      // cache nodes, addr:port weight
      "127.0.0.1:6379" : 1
    }
  };

  var options = {
    "debug"  : false,
    "config" : new ResistConfig(resistConfigOptions, function (config) {
      config.setHost("dod.net", {
        "proxy_host"     : "208.78.244.151",  // remote host to proxy to
        "proxy_port"     : 80,                // remote port to proxy to
        "proxy_xforward" : true,              // true/false xforward
        "proxy_timeout"  : 5000,              // millisecond before timeout
        "proxy_sockets"  : 20000,             // max proxy sockets
      });

      self.resistServer = new ResistServer(options);
      callback();
    })
  };


  this.cache = new ResistCache();
  this.req = {};
  this.res = {};
  this.res.writeHead = stub();
  this.res.write = stub();
  this.res.end = stub();

  this.options = options;
}

function _tear_down(callback) {
  JSON.parse = this.backup.jsonParse;
  this.resistServer.destroy();
  this.options.config.destroy();
  callback();
}

exports.resist_server = {
  setUp : _set_up,
  tearDown : _tear_down,
  'testing ResistServer module' : function (test) {
    test.expect(2);
    test.isNotNull(ResistServer);
    test.isFunction(ResistServer);
    test.done();
  },
  'should be object' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistServer);
    test.isObject(this.resistServer);
    test.done();
  },
  'should set defaults in constructor' : function (test) {
    test.expect(3);
    test.ok(!(this.resistServer.debug));
    test.isObject(this.resistServer.config);
    test.isObject(this.resistServer.httpProxyServer);
    test.done();
  },
  'should have sendCachedResponse method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistServer.sendCachedResponse);
    test.isFunction(this.resistServer.sendCachedResponse);
    test.done();
  },
  'sendCachedResponse should call writeHead with two args' : function (test) {
    // sendCachedResponse resets this.res.writeHead
    test.expect(5);
    var writeHead = this.res.writeHead;
    this.resistServer.sendCachedResponse(this.res, this.cache);
    test.isFunction(this.res.writeHead);
    test.isUndefined(this.res.writeHead.called);
    test.isFunction(writeHead);
    test.ok(writeHead.called);
    test.equal(writeHead.args.length, 2);
    test.done();
  },
  'sendCachedResponse should call writeHead with three args' : function (test) {
    // sendCachedResponse resets this.res.writeHead
    test.expect(5);
    this.cache.getReason = function () {
      return true;
    };
    var writeHead = this.res.writeHead;
    this.resistServer.sendCachedResponse(this.res, this.cache);
    test.isFunction(this.res.writeHead);
    test.isUndefined(this.res.writeHead.called);
    test.isFunction(writeHead);
    test.ok(writeHead.called);
    test.equal(writeHead.args.length, 3);
    test.done();
  },
  'sendCachedResponse should call write with one arg' : function (test) {
    // sendCachedResponse resets this.res.write
    test.expect(5);
    var write = this.res.write;
    this.resistServer.sendCachedResponse(this.res, this.cache);
    test.isFunction(this.res.write);
    test.isUndefined(this.res.write.called);
    test.isFunction(write);
    test.ok(write.called);
    test.equal(write.args.length, 1);
    test.done();
  },
  'sendCachedResponse should call end' : function (test) {
    // sendCachedResponse resets this.res.end
    test.expect(4);
    var end = this.res.end;
    this.resistServer.sendCachedResponse(this.res, this.cache);
    test.isFunction(this.res.end);
    test.isUndefined(this.res.end.called);
    test.isFunction(end);
    test.ok(end.called);
    test.done();
  },
  'should have proxyError method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistServer.proxyError);
    test.isFunction(this.resistServer.proxyError);
    test.done();
  },
  'proxyError should call res methods' : function (test) {
    test.expect(9);
    var err;
    this.resistServer.proxyError(err, this.req, this.res);
    test.ok(this.res.writeHead.called);
    test.equal(this.res.writeHead.args[0], 500);
    test.equal(this.res.writeHead.args[1], 'Internal Server Error');
    test.isObject(this.res.writeHead.args[2]);
    test.deepEqual(this.res.writeHead.args[2], {
      'Content-Type': 'text/plain'
    });
    test.ok(this.res.write.called);
    test.equal(
      this.res.write.args[0],
      'Internal Server Error: please try again later.'
    );
    test.ok(this.res.end.called);
    test.equal(this.res.end.args.length, 0);
    test.done();
  },
  'proxyError should skip res.write is req.method is HEAD' : function (test) {
    test.expect(3);
    var err;
    this.req['method'] = 'HEAD';
    this.resistServer.proxyError(err, this.req, this.res);
    test.ok(this.res.writeHead.called);
    test.ok(!(this.res.write.called));
    test.ok(this.res.end.called);
    test.done();
  },
  'should have proxyTimeout method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistServer.proxyTimeout);
    test.isFunction(this.resistServer.proxyTimeout);
    test.done();
  },
  'proxyTimeout should call res methods' : function (test) {
    test.expect(9);
    this.resistServer.proxyTimeout(this.req, this.res);
    test.ok(this.res.writeHead.called);
    test.equal(this.res.writeHead.args[0], 504);
    test.equal(this.res.writeHead.args[1], 'Gateway Timeout');
    test.isObject(this.res.writeHead.args[2]);
    test.deepEqual(this.res.writeHead.args[2], {
      'Content-Type': 'text/plain'
    });
    test.ok(this.res.write.called);
    test.equal(
      this.res.write.args[0],
      'Gateway Timeout: please try again later.'
    );
    test.ok(this.res.end.called);
    test.equal(this.res.end.args.length, 0);
    test.done();
  },
  'proxyTimeout should skip res.write is req.method is HEAD' : function (test) {
    test.expect(3);
    this.req['method'] = 'HEAD';
    this.resistServer.proxyTimeout(this.req, this.res);
    test.ok(this.res.writeHead.called);
    test.ok(!(this.res.write.called));
    test.ok(this.res.end.called);
    test.done();
  },
  'should have destroy method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistServer.destroy);
    test.isFunction(this.resistServer.destroy);
    test.done();
  },
  'destroy should call httpProxyServer.close(callback)' : function (test) {
    var self = this;
    test.expect(2);
    this.backup.close = this.resistServer.httpProxyServer.close;
    this.resistServer.httpProxyServer.close = function (callback) {
      test.ok(true);
      return callback();
    };
    this.resistServer.destroy(function () {
      test.ok(true);
      self.resistServer.httpProxyServer.close = self.backup.close;
      test.done();
    });
  }
};
