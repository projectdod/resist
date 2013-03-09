var ResistServer = require("../lib/resist_server"),
    ResistConfig = require("../lib/resist_config"),
    Gossiper     = require('gossiper').Gossiper,
    stub         = require("./fixtures/stub");

// change to number of servers we spin up
var NUM_SERVERS = 2;
var seed;

function _set_up(callback) {
  var self = this;
  var serverCount = 0;

  this.backup = {};
  this.backup.jsonParse = JSON.parse;

  var doneStartup = function () {
    serverCount++;
    if (serverCount === NUM_SERVERS) {
      callback();
    }
  };

  seed = new Gossiper(7000, [], '127.0.0.1');
  seed.start(function () {
    // First resist server
    var resistConfig01 = {
      "gossip"         : new Gossiper(7001, ['127.0.0.1:7000']),
      "port"           : 8001,                // local port
      "cache_timeout"  : 300,                 // seconds
      "cache_purge"    : 3600,                // sec before local memory purge
      "cache_type"     : 'local',             // type of cache
      "cache_nodes"    : {                    // cache nodes, addr:port weight
        "127.0.0.1:6379" : 1
      }
    }

    var options01 = {
      "debug"  : false,
      "config" : new ResistConfig(resistConfig01, function () {
        this.setHost("dod.net", {
          "proxy_host"     : "localhost",       // remote host to proxy to
          "proxy_port"     : 8081,              // remote port to proxy to
          "proxy_xforward" : true,              // true/false xforward
          "proxy_timeout"  : 5000,              // millisecond before timeout
          "proxy_sockets"  : 20000,             // max proxy sockets
        });

        self.resist01 = new ResistServer(options01);
        doneStartup();
      })
    };

    // Second resist server
    var resistConfig02 = {
      "gossip"         : new Gossiper(7002, ['127.0.0.1:7000']),
      "port"           : 8002,                // local port
      "cache_timeout"  : 300,                 // seconds
      "cache_purge"    : 3600,                // sec before local memory purge
      "cache_type"     : 'local',             // type of cache
      "cache_nodes"    : {                    // cache nodes, addr:port weight
        "127.0.0.1:6379" : 1
      }
    };

    var options02 = {
      "debug"  : false,
      "config" : new ResistConfig(resistConfig02, function () {
        this.setHost("resist02.dod.net", {
          "proxy_host"     : "localhost",       // remote host to proxy to
          "proxy_port"     : 8082,              // remote port to proxy to
          "proxy_xforward" : true,              // true/false xforward
          "proxy_timeout"  : 5000,              // millisecond before timeout
          "proxy_sockets"  : 20000,             // max proxy sockets
        });

        self.resist02 = new ResistServer(options02);
        doneStartup();
      })
    };

    self.options01 = options01;
    self.options02 = options02;
  });
}

function _tear_down(callback) {
  var self = this;
  var serverCount = NUM_SERVERS;

  var doneShutdown = function () {
    serverCount--;
    if (serverCount === 0) {
      self.options01.config.destroy();
      self.options02.config.destroy();
      seed.stop();
      callback();
    }
  };

  JSON.parse = this.backup.jsonParse;
  this.resist01.destroy(doneShutdown());
  this.resist02.destroy(doneShutdown());
}

exports.blackbox = {
  setUp : _set_up,
  tearDown : _tear_down,
  'testing resist01 came up' : function (test) {
    test.expect(2);
    test.isNotNull(this.resist01);
    test.isObject(this.resist01);
    test.done();
  },
  'testing resist02 came up' : function (test) {
    test.expect(2);
    test.isNotNull(this.resist02);
    test.isObject(this.resist02);
    test.done();
  },
  'resist01 can get at its own config data' : function (test) {
    test.expect(2);
    test.isNotNull(this.resist01.config.getHost("dod.net"));
    test.isObject(this.resist01.config.getHost("dod.net"));
    test.done();
  },
  'resist02 can get at its own config data' : function (test) {
    test.expect(2);
    test.isNotNull(this.resist02.config.getHost("resist02.dod.net"));
    test.isObject(this.resist02.config.getHost("resist02.dod.net"));
    test.done();
  },
  'resist01 can get at resist02 config data' : function (test) {
    var self = this;
    test.expect(2);

    var testTimeout = function () {
      if (self.resist01.config.getHost("resist02.dod.net")) {
        process.stdout.write("\n");
        test.isNotNull(self.resist01.config.getHost("resist02.dod.net"));
        test.isObject(self.resist01.config.getHost("resist02.dod.net"));
        test.done();
      } else {
        process.stdout.write(".");
        setTimeout(testTimeout, 500);
      }
    };

    process.stdout.write("  waiting");
    setTimeout(testTimeout, 500);
  },
  'resist02 can get at resist01 config data' : function (test) {
    var self = this;
    test.expect(2);

    var testTimeout = function () {
      if (self.resist02.config.getHost("dod.net")) {
        process.stdout.write("\n");
        test.isNotNull(self.resist02.config.getHost("dod.net"));
        test.isObject(self.resist02.config.getHost("dod.net"));
        test.done();
      } else {
        process.stdout.write(".");
        setTimeout(testTimeout, 500);
      }
    };

    process.stdout.write("  waiting");
    setTimeout(testTimeout, 500);
  }
};
