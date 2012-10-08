"use strict";

var http      = require('http'),
    httpProxy = require('http-proxy'),
    Config    = require('./config'),
    HttpCache = require('./http_cache');

function ResistServer(options) {
  if (false === (this instanceof ResistServer)) {
   return new ResistServer(options);
  }

  var self = this;

  self.options         = options              || {};
  self.debug           = options.debug        || false;
  self.config          = options.config       || new Config();

  self.httpProxyServer = httpProxy.createServer(function (req, res, proxy) {
    var cacheOptions = {
      "debug"        : self.debug,
      "type"         : self.config.getHost('dod.net').cache_type,
      "cacheNodes"   : self.config.getHost('dod.net').cache_nodes,
      "cacheTimeout" : self.config.getHost('dod.net').cache_timeout,
      "cleanMemory"  : self.config.getHost('dod.net').cache_purge 
    };
    var cache = new HttpCache(cacheOptions);
    var reqBuffer = httpProxy.buffer(req);

    try {
      cache.get(req, function (result) {
        // Right out of cache. So fast!
        if (result && !result.isStale()) {
          self.sendCachedResponse(res, result);
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
            if (self.debug) { console.log("proxy: " + cache.buildKey()); }
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

            res.ignoreTimeout = true;

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

              return self.sendCachedResponse(res, result);
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
            res.ignoreTimeout = true;
            cache.setBody(data);
            tmpWrite.call(res, data);
        };

        res.end = function (data) {
            res.ignoreTimeout = true;
            if (arguments.length > 0) {
              cache.setBody(data);
              tmpEnd.call(res, data);
            } else {
              tmpEnd.call(res);
            }
        };

        res.on('finish', setCache);

        var proxyOptions = {
          host       : self.config.getHost('dod.net').proxy_host,
          port       : self.config.getHost('dod.net').proxy_port,
          maxSockets : self.config.getHost('dod.net').proxy_sockets,
          buffer     : reqBuffer,
          enable     : {
            xforward : self.config.getHost('dod.net').proxy_xforward
          }
        };

        proxy.proxyRequest(req, res, proxyOptions);
      });
    }
    catch (err) {
      console.error(err);
    }
  });

  self.httpProxyServer.listen(self.config.getHost('dod.net').http_port);
  self.httpProxyServer.proxy.on('proxyError', self.proxyError);
  self.httpProxyServer.proxy.on('start', function (req, res, target) {
    // I can't say I love this fix.  If the origin server is down, we have
    // to time the connection out at some point.  The problem is, once we
    // time it out, the proxy just sits around in the background for a while
    // sucking up memory.  This means an active server can get very boated.
    setTimeout(
      self.proxyTimeout, self.config.getHost('dod.net').proxy_timeout, req, res
    );
  });
}

ResistServer.prototype.sendCachedResponse = function (res, cache) {
  if (this.debug) { console.log("cache: " + cache.buildKey()); }
  if (cache.getReason()) {
    res.writeHead(cache.getCode(), cache.getReason(), cache.getHeaders());
  } else {
    res.writeHead(cache.getCode(), cache.getHeaders());
  }

  res.write(cache.getBody());
  res.end();
};

ResistServer.prototype.proxyError = function (err, req, res) {
  res.writeHead(500, "Internal Server Error", {
    'Content-Type' : 'text/plain'
  });

  if (req.method !== 'HEAD') {
    res.write("Internal Server Error: please try again later.");
  }

  res.end();
};

ResistServer.prototype.proxyTimeout = function (req, res) {
  if (res.ignoreTimeout) {
    return;
  }

  res.writeHead(504, "Gateway Timeout", { 'Content-Type' : 'text/plain' });
  res.writeHead = function () {};
  if (req.method !== 'HEAD') {
    res.write("Gateway Timeout: please try again later.");
    res.write = function () {};
  }
  res.end();
  res.end = function () {};
};

module.exports = ResistServer;
