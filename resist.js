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
      "hostname"         : "208.78.244.151",
      "remote_port"      : 80,
      "xforward"         : true,
      "local_port"       : 80,
      "cache_timeout"    : 300,
      "clean_memory"     : 2,
      "max_sockets"      : 20000,
      "cacheType"        : 'redis',
      "cacheHost"        : '127.0.0.1',
      "cachePort"        : '6379'
    });

    startResistProxy();
  });
}

function sendCachedResponse(res, cache) {
  if (cache.getReason()) {
    res.writeHead(cache.getCode(), cache.getReason(), cache.getHeaders());
  } else {
    res.writeHead(cache.getCode(), cache.getHeaders());
  }

  res.write(cache.getBody());
  res.end();
}

function startResistProxy() {
  var httpProxyServer = httpProxy.createServer(function (req, res, proxy) {
    var cacheOptions = {
      "type"         : config.getHost('dod.net').cacheType,
      "cacheHost"    : config.getHost('dod.net').cacheHost,
      "cachePort"    : config.getHost('dod.net').cachePort,
      "cacheTimeout" : config.getHost('dod.net').cache_timeout,
      "cleanMemory"  : config.getHost('dod.net').clean_memory 
    };
    var cache = new HttpCache(cacheOptions);
    var reqBuffer = httpProxy.buffer(req);

    cache.get(req, function (result) {
      if (result && !result.isStale()) {
        // Right out of cache. So fast!
console.log("cache: " + cache.buildKey());
        sendCachedResponse(res, result);
        return;
      }

      // Use some trick like this to get at the data for caching.
      var tmpWrite = res.write;
      var tmpWriteHead = res.writeHead;
      var tmpEnd = res.end;
      var setCache = function () {
        try {
          cache.set(res);
        }
        catch (err) {
          console.error(err);
        }
      };

      res.writeHead = function (code, reason, headers) {
          var code = arguments[0];
          var headers = arguments[1];
          var reason = undefined;

          if (arguments.length === 3) {
            reason = arguments[1];
            headers = arguments[2];
          }

          // If we get an error response, and we have an old cached value that
          // is a non-error response, we should use that.
          // OR:
          // If we get a 304 response that nothing has changed, and we have
          // a cached value, we should serve the cached value and update the
          // cache headers.
          if (result
              && ((code >= 400 && code != 410)
                || code == 304)) {
            // reset these back to normal before we push cache out
            res.write = tmpWrite;
            res.writeHead = tmpWriteHead;
            res.end = tmpEnd;
            res.removeListener('finish', setCache);

            if (code == 304) {
              cache.mergeHeaders(headers);
              cache.update(result);
            }

            sendCachedResponse(res, result);
            return;
          }

          cache.clearBody();
          cache.setCode(code);
          cache.setReason(reason);
          cache.setHeaders(headers);

          if (reason) {
            tmpWriteHead.call(res, code, reason, headers);
          } else {
            tmpWriteHead.call(res, code, headers);
          }
      };

      res.write = function (data) {
          cache.setBody(data);
          tmpWrite.call(res, data);
      };

      res.end = function (data) {
          if (arguments.length > 0) {
            cache.setBody(data);
            tmpEnd.call(res, data);
          } else {
            tmpEnd.call(res);
          }
      };

      res.on('finish', setCache);

      var proxyOptions = {
        host       : config.getHost('dod.net').hostname,
        port       : config.getHost('dod.net').remote_port,
        maxSockets : config.getHost('dod.net').max_sockets,
        buffer     : reqBuffer,
        enable     : {
          xforward : config.getHost('dod.net').xforward
        }
      };

console.log("proxy: " + cache.buildKey());
      proxy.proxyRequest(req, res, proxyOptions);
    });
  });

  httpProxyServer.listen(config.getHost('dod.net').local_port);
}
