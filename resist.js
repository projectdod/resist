#!/usr/bin/env node

var util      = require('util'),
    http      = require('http'),
    cluster   = require('cluster'),
    os        = require('os'),
    httpProxy = require('http-proxy'),
    HttpCache = require('./lib/http_cache'),
    Config    = require('./lib/config');

//
// You should not need to change anything below this line, unless you know
// what you're doing.
//
var config;
var cpus = os.cpus().length;

if (cluster.isMaster) {
  var welcome = "\
   +----------------------------------------------------------------------+\n\
   |..RESIST...A.REVERSE.CACHING.PROXY...................  _  ............|\n\
   |..................................................... | | ............|\n\
   |..#### ...........#### .............................. |~| .......   ..|\n\
   |..## ## ...#### ..## ## ......### ..#### ..## ......  |~|  _  _  /~) .|\n\
   |..##  ## .##  ## .##  ## .....##### ## # ###### ...  /|_|.|-||-|/~/  .|\n\
   |..##  ## .##  ## .##  ## .....##.## #### ..## ..... |~'   `-'`-'~/ ...|\n\
   |..## ## ...#### ..## ## ..## .##.## ## ....## ..... \\ ) -\\_ .--  ) ...|\n\
   |..#### ...........#### ...## .##.## #### ..## .....  \\_    Y    / ....|\n\
   |.....................................................  \\   ^   / .....|\n\
   +--------------------------------------------------------|~   ~|-------+\n\
                              Be The Media\n";
  util.puts(welcome);

  for (var i = 0; i < cpus; i++) {
    cluster.fork();
  }

  cluster.on('death', function(worker) {
    util.puts('worker ' + worker.pid + ' died');
    cluster.fork();
  });
} else {
  util.puts('worker ' + process.pid + ': started');
  // godsflaw: This is just bootstrapping.  Normally this will not be in
  // production versions.
  config = new Config(function () {
    config.setHost("dod.net", {
      "hostname"         : "darkside.dod.net",
      "remote_port"      : 80,
      "x_forwarded_for"  : true,
      "local_port"       : 8000,
      "cache_timeout"    : 300,
      "clean_memory"     : 2,
      "max_sockets"      : 20000,
      "cacheType"        : 'local'
    });

    config.setHost("0xDEADBEEF", {
      "local_port"       : 8000
    });

    startResistProxy();
  });
}

function startResistProxy() {
  var httpProxyServer = httpProxy.createServer(function (req, res, proxy) {
    var cacheOptions = {
      "type"        : config.getHost('dod.net').cacheType,
      "host"        : '127.0.0.1:11211',
      "cleanMemory" : config.getHost('dod.net').clean_memory 
    };
    var cache = new HttpCache(cacheOptions);
    var reqBuffer = httpProxy.buffer(req);
    var result = cache.get(req);

    if (result) {
      if (result.reason) {
        res.writeHead(result.code, result.reason, result.headers);
      } else {
        res.writeHead(result.code, result.headers);
      }

      res.write(result.body);
      res.end();

      // If we don't have to fetch again, just return here.  So fast!
      if (!cache.isStale()) {
        return;
      }

      // Oh this is total hacks so we don't have to change the core lib
      res.writeHead = function () {};
      res.write     = function () {};
      res.end       = function () {};
    }

    var proxyOptions = {
      host             : config.getHost('dod.net').hostname,
      port             : config.getHost('dod.net').remote_port,
      enableXForwarded : config.getHost('dod.net').x_forwarded_for,
      maxSockets       : config.getHost('dod.net').max_sockets,
      buffer           : reqBuffer
    };

    // Use some trick like this to get at the data for caching.
    var _write = res.write;
    var _writeHead = res.writeHead;
    var _end = res.end;

    res.writeHead = function (code, reason, headers) {
        var code = arguments[0];
        var headers = arguments[1];
        var reason;

        if (arguments.length === 3) {
          reason = arguments[1];
          headers = arguments[2];
        }

console.log(code);
console.log(reason);
console.log(headers.toString());

        cache.setCode(code);
        cache.setReason(reason);
        cache.setHeaders(headers);

        if (reason) {
          _writeHead.call(res, code, reason, headers);
        } else {
          _writeHead.call(res, code, headers);
        }
    };

    res.write = function (data) {
console.log(data.toString());
        cache.setBody(data);
        _write.call(res, data);
    };

    res.end = function (data) {
        if (arguments.length > 0) {
console.log(data.toString());
          cache.setBody(data);
          _end.call(res, data);
        } else {
console.log("res.end() called");
          _end.call(res);
        }
    };

    res.on('finish', function () {
      cache.set(req);
    });

    proxy.proxyRequest(req, res, proxyOptions);
  });

  httpProxyServer.listen(config.getHost('0xDEADBEEF').local_port);
}
