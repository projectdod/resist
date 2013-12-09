#!/usr/bin/env node

var os                  = require('os'),
    cluster             = require('cluster'),
    resistConfigOptions = require("./conf/resist-server-config"),
    ResistServer        = require('./lib/resist_server'),
    ResistConfig        = require('./lib/resist_config');

//
// You should not need to change anything below this line,
// unless you know what you're doing.
//
var cpus = os.cpus().length;
var DEBUG = true;

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

  cluster.on('exit', function(worker, code, signal) {
    if (DEBUG) { console.log('worker ' + worker.process.pid + ' died'); }
    setTimeout(function () { cluster.fork(); }, 5000);
  });
} else {
  if (DEBUG) { console.log('worker ' + process.pid + ': started'); }

  var resistConfig = new ResistConfig(resistConfigOptions, function (config) {
    config.setHost("__default__", {
      "proxy_host"     : "208.166.57.163", // remote host to proxy to
      "proxy_port"     : 80,               // remote port to proxy to
      "proxy_xforward" : true,             // true/false xforward
      "proxy_timeout"  : 5000,             // millisecond before timeout
      "proxy_sockets"  : 20000,            // max proxy sockets
    });

    var resistServer = new ResistServer({
      "config" : config,
      "debug"  : DEBUG
    });
  });
}
