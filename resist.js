#!/usr/bin/env node

var os                  = require('os'),
    cluster             = require('cluster'),
    resistConfigOptions = require("./conf/resist-server-config"),
    routes              = require("./conf/routes"),
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
    // XXX: so yeah, make this syntax correct
    for (var key in routes) {
      config.setHost(key, routes[key]);
    }

    var resistServer = new ResistServer({
      "config" : config,
      "debug"  : DEBUG
    });
  });
}
