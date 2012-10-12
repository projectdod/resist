#!/usr/bin/env node

var os           = require('os'),
    cluster      = require('cluster'),
    ResistServer = require('./lib/resist_server'),
    Config       = require('./lib/config');

//
// You should not need to change anything below this line, unless you know
// what you're doing.
//
var cpus = os.cpus().length;
var DEBUG = false;

if (!(DEBUG)) {
    process.env.NODE_ENV = "production";
}

process.on('uncaughtException', function (err) {
    if (err.stack) {
        err.stack.split("\n").forEach(function (line) {
            console.error(line);
        });
    }
    else {
        console.error('Caught exception: ' + err);
    }
    process.exit(1);
});

if (cluster.isMaster) {
  for (var i = 0; i < cpus; i++) {
    cluster.fork();
  }

  cluster.on('death', function(worker) {
    if (DEBUG) { console.log('worker ' + worker.pid + ' died'); }
    cluster.fork();
  });
} else {
  if (DEBUG) { console.log('worker ' + process.pid + ': started'); }
  // godsflaw: This is just bootstrapping.  Normally this will not be in
  // production versions.  For now, it is easy to get running.
  var config = new Config(function () {
    config.setHost("dod.net", {
      "http_port"      : 80,                  // local port
      "proxy_host"     : "208.78.244.151",    // remote host to proxy to
      "proxy_port"     : 80,                  // remote port to proxy to
      "proxy_xforward" : true,                // true/false xforward
      "proxy_timeout"  : 20000,               // millisecond before timeout
      "proxy_sockets"  : 20000,               // max proxy sockets
      "cache_timeout"  : 300,                 // seconds
      "cache_purge"    : 3600,                // sec before local memory purge
      "cache_type"     : 'redis',             // type of cache
      "cache_nodes"    : {                    // cache nodes, addr:port weight
        "10.41.54.144:6379" : 1,
        "10.41.54.149:6379" : 1
      }
    });

    var resistOptions = {
      "config" : config,
      "debug"  : DEBUG
    };

    var resistServer = new ResistServer(resistOptions);
  });
}
