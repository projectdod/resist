#!/usr/bin/env node

var http      = require('http'),
    util      = require('util'),
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

  cluster.on('death', function(worker) {
    if (DEBUG) { console.log('worker ' + worker.pid + ' died'); }
    cluster.fork();
  });
} else {
  if (DEBUG) { console.log('worker ' + process.pid + ': started'); }
  // godsflaw: This is just bootstrapping.  Normally this will not be in
  // production versions.  For now, it is easy to get running.
  config = new Config(function () {
    config.setHost("dod.net", {
      "http_port"      : 80,                  // local port
      "proxy_host"     : "208.78.244.151",    // remote host to proxy to
      "proxy_port"     : 80,                  // remote port to proxy to
      "proxy_xforward" : true,                // true/false xforward
      "proxy_timeout"  : 2000,                // millisecond before timeout
      "proxy_sockets"  : 20000,               // max proxy sockets
      "cache_timeout"  : 300,                 // seconds
      "cache_purge"    : 2,                   // hours before local memory purge
      "cache_type"     : 'redis',             // type of cache
      "cache_nodes"    : {                    // cache nodes, addr:port weight
        "10.41.54.144:6379" : 1,
        "10.41.54.149:6379" : 1
      }
    });

    startResistProxy();
  });
}

function startResistProxy() {
  var httpProxyServer = httpProxy.createServer(function (req, res, proxy) {
    var cacheOptions = {
      "debug"        : DEBUG,
      "type"         : config.getHost('dod.net').cache_type,
      "cacheNodes"   : config.getHost('dod.net').cache_nodes,
      "cacheTimeout" : config.getHost('dod.net').cache_timeout,
      "cleanMemory"  : config.getHost('dod.net').cache_purge 
    };
    var cache = new HttpCache(cacheOptions);
    var reqBuffer = httpProxy.buffer(req);

    try {
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
          host       : config.getHost('dod.net').proxy_host,
          port       : config.getHost('dod.net').proxy_port,
          maxSockets : config.getHost('dod.net').proxy_sockets,
          buffer     : reqBuffer,
          enable     : {
            xforward : config.getHost('dod.net').proxy_xforward
          }
        };

        proxy.proxyRequest(req, res, proxyOptions);
        setTimeout(function () {
          proxyTimeout(new Error("Gateway Timeout"), req, res);
        }, config.getHost('dod.net').proxy_timeout);
      });
    }
    catch (err) {
      console.error(err);
    }
  });

  httpProxyServer.listen(config.getHost('dod.net').http_port);
  httpProxyServer.proxy.on('proxyError', proxyError);
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

function proxyError(err, req, res) {
  res.writeHead(500, "Internal Server Error", {
    'Content-Type' : 'text/plain'
  });
  if (req.method !== 'HEAD') {
    res.write("Internal Server Error: please try again later.");
  }
  res.end();
}

function proxyTimeout(err, req, res) {
  res.writeHead(504, "Gateway Timeout", { 'Content-Type' : 'text/plain' });
  if (req.method !== 'HEAD') {
    res.write("Gateway Timeout: please try again later.");
  }
  res.end();
}
