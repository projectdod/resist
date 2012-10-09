var ResistServer = require("../lib/resist_server"),
    Config       = require("../lib/config"),
    stub         = require("./fixtures/stub");

function _set_up(callback) {
  var self = this;
  var serverCount = 0;

  this.backup = {};
  this.backup.jsonParse = JSON.parse;

  var doneStartup = function () {
    serverCount++;
    // change to number of servers we spin up
    if (serverCount === 1) {
      callback();
    }
  };

  var options01 = {
    "debug"  : false,
    "config" : new Config(function () {
      this.setHost("dod.net", {
        "http_port"      : 8001,              // local port
        "proxy_host"     : "localhost",       // remote host to proxy to
        "proxy_port"     : 8081,              // remote port to proxy to
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

      self.resist01 = new ResistServer(options01);
      doneStartup();
    })
  };

//
//  XCAMX: when ResistServer can work off of more than one origin definition
//         we can start to test this.
//
//  var options02 = {
//    "debug"  : false,
//    "config" : new Config(function () {
//      this.setHost("resist02.dod.net", {
//        "http_port"      : 8002,              // local port
//        "proxy_host"     : "localhost",       // remote host to proxy to
//        "proxy_port"     : 8082,              // remote port to proxy to
//        "proxy_xforward" : true,              // true/false xforward
//        "proxy_timeout"  : 5000,              // millisecond before timeout
//        "proxy_sockets"  : 20000,             // max proxy sockets
//        "cache_timeout"  : 300,               // seconds
//        "cache_purge"    : 3600,              // sec before local memory purge
//        "cache_type"     : 'local',           // type of cache
//        "cache_nodes"    : {                  // cache nodes, addr:port weight
//          "127.0.0.1:6379" : 1
//        }
//      });
//
//      self.resist02 = new ResistServer(options02);
//      doneStartup();
//    })
//  };

  this.options01 = options01;
//  this.options02 = options02;
}

function _tear_down(callback) {
  JSON.parse = this.backup.jsonParse;
  this.resist01.destroy();
//  this.resist02.destroy();
  this.options01.config.destroy();
//  this.options02.config.destroy();
  callback();
}

exports.blackbox = {
  setUp : _set_up,
  tearDown : _tear_down,
  'testing resist01 came up' : function (test) {
    test.expect(2);
    test.isNotNull(this.resist01);
    test.isObject(this.resist01);
    test.done();
//  },
//  'testing resist02 came up' : function (test) {
//    test.expect(2);
//    test.isNotNull(this.resist02);
//    test.isObject(this.resist02);
//    test.done();
  }
};
