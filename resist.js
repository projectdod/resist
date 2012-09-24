#!/usr/bin/env node

var util      = require('util'),
    http      = require('http'),
    os        = require('os'),
    cluster   = require('cluster'),
    httpProxy = require('http-proxy'),
    HttpCache = require('./lib/http_cache'),
    Config    = require('./lib/config');

//
// You should not need to change anything below this line, unless you know
// what you're doing.
//
var config;
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
  // production versions.  For now, it is easy to get running.
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
      "cacheHost"        : '10.41.54.149',
      "cachePort"        : '6379'
    });

    startResistProxy();
  });
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
      // Right out of cache. So fast!
      if (result && !result.isStale()) {
        sendCachedResponse(res, result);
        return;
      }

      // If we do not have a cache entry for this request, but the
      // request came in with an If-Modified-Since header or an
      // If-None-Match header, we should strip those heaers before
      // contacting the origin server.  Otherwise we will get a 304
      // pass it through, and never re-populate the cache.
      if (!(result)
        && (req.headers['if-none-match']
          || req.headers['if-modified-since'])) {
        delete req.headers['if-none-match'];
        delete req.headers['if-modified-since'];
      }

      // Use some trick like this to get at the data for caching.
      var tmpWrite = res.write;
      var tmpWriteHead = res.writeHead;
      var tmpEnd = res.end;
      var setCache = function () {
        try {
          if (DEBUG) { console.log("proxy: " + cache.buildKey()); }
          cache.set(res);
        }
        catch (err) {
          console.error(err);
          console.error(util.inspect(cache, true, null));
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
              try {
                result.mergeHeaders(headers);
                result.update();
              }
              catch (err) {
                console.error(err);
                console.error(util.inspect(result, true, null));
              }

            }

            return sendCachedResponse(res, result);
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

      proxy.proxyRequest(req, res, proxyOptions);
    });
  });

  httpProxyServer.listen(config.getHost('dod.net').local_port);
}

function sendCachedResponse(res, cache) {
  if (DEBUG) { console.log("cache: " + cache.buildKey()); }
  if (cache.getReason()) {
    res.writeHead(cache.getCode(), cache.getReason(), cache.getHeaders());
  } else {
    res.writeHead(cache.getCode(), cache.getHeaders());
  }

  res.write(cache.getBody());
  res.end();
}

