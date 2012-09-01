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

function sendCachedResponse(res, cachedRes) {
  if (cachedRes.reason) {
    res.writeHead(cachedRes.code, cachedRes.reason, cachedRes.headers);
  } else {
    res.writeHead(cachedRes.code, cachedRes.headers);
  }

  res.write(cachedRes.body);
  res.end();
}

function startResistProxy() {
  var storage = {};

  var httpProxyServer = httpProxy.createServer(function (req, res, proxy) {
    var cacheOptions = {
      "type"         : config.getHost('dod.net').cacheType,
      "host"         : '127.0.0.1:11211',
      "cache"        : storage,
      "cacheTimeout" : config.getHost('dod.net').cache_timeout,
      "cleanMemory"  : config.getHost('dod.net').clean_memory 
    };
    var cache = new HttpCache(cacheOptions);
    var reqBuffer = httpProxy.buffer(req);
    var result = cache.get(req);

    if (result && !cache.isStale()) {
      // Right out of cache. So fast!
      sendCachedResponse(res, result);
      return;
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

        // If we get an error response, and we have an old cached value that
        // is a non-error response, we should use that.
        if (code >= 400 && result && result.code < 400) {
          // reset these back to normal before we push cache out
          res.write = _write;
          res.writeHead = _writeHead;
          res.end = _end;
          sendCachedResponse(res, result);
          return;
        }

        if (arguments.length === 3) {
          reason = arguments[1];
          headers = arguments[2];
        }

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
        cache.setBody(data);
        _write.call(res, data);
    };

    res.end = function (data) {
        if (arguments.length > 0) {
          cache.setBody(data);
          _end.call(res, data);
        } else {
          _end.call(res);
        }
    };

    res.on('finish', function () {
      cache.set(res);
    });

    proxy.proxyRequest(req, res, proxyOptions);
  });

  httpProxyServer.listen(config.getHost('0xDEADBEEF').local_port);
}
