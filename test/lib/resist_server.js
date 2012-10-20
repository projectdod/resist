var ResistServer = require("../../lib/resist_server"),
    ResistConfig = require("../../lib/resist_config"),
    stub         = require("../fixtures/stub");

function _set_up(callback) {
  var self = this;

  this.backup = {};
  this.backup.jsonParse = JSON.parse;

  var options = {
    "debug"  : false,
    "config" : new ResistConfig(function () {
      this.setHost("dod.net", {
        "http_port"      : 8000,              // local port
        "proxy_host"     : "208.78.244.151",  // remote host to proxy to
        "proxy_port"     : 80,                // remote port to proxy to
        "proxy_xforward" : true,              // true/false xforward
        "proxy_timeout"  : 5000,              // millisecond before timeout
        "proxy_sockets"  : 20000,             // max proxy sockets
        "cache_timeout"  : 300,               // seconds
        "cache_purge"    : 3600,              // sec before local memory purge
        "cache_type"     : 'local',           // type of cache
        "cache_nodes"    : {                  // cache nodes, addr:port weight
          "127.0.0.1:6379" : 1
        }
      });

      self.resistServer = new ResistServer(options);
      callback();
    })
  };

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
  'should have proxyTimeout method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistServer.proxyTimeout);
    test.isFunction(this.resistServer.proxyTimeout);
    test.done();
  },
  'should have proxyError method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistServer.proxyError);
    test.isFunction(this.resistServer.proxyError);
    test.done();
  },
  'should have sendCachedResponse method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistServer.sendCachedResponse);
    test.isFunction(this.resistServer.sendCachedResponse);
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
