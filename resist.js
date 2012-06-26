#!/usr/bin/env node

var util      = require('util'),
    http      = require('http'),
    cluster   = require('cluster'),
    os        = require('os'),
    httpProxy = require('http-proxy'),
    Cache     = require('./lib/cache'),
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

    startResist();
  });
}

function startResist() {
  var cacheOptions = {
    "type"      : config.getHost('dod.net').cacheType,
    "host"      : '127.0.0.1:11211'
  };

  var cache = new Cache(cacheOptions);

  var httpProxyServer = httpProxy.createServer(function (req, res, proxy) {
    var reqBuffer = httpProxy.buffer(req);
    var resBuffer = cache.get(req);

    if (resBuffer) {
      res.end(resBuffer);

      // If we don't have to fetch again, just return here.  So fast!
      if (!cache.isStale()) {
        return;
      }

// XXX: rewrite got here.

      // Oh this is total hacks so we don't have to change the core lib
      res.writeHead = function (arg1, arg2) {};
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

    res.write = function (data) {
        console.log(data.toString());
        _write.call(res, data);
    }

    proxy.proxyRequest(req, res, proxyOptions);
    res.on('finish', _handleResponse);
  });

  httpProxyServer.listen(config.getHost('0xDEADBEEF').local_port);
}

function _handleResponse(req, res, buffer) {
  var keyPrefix = '';

  if (mobile.test(req.headers['user-agent'])) {
    keyPrefix = 'mobile-';
  }

  // if cacheOk was false, this is always 0
  if (buffer && buffer.length > 0) {
    var data = {
      'buffer'    : buffer,
      'timeout'   : false
    };

    if (config.getHost('dod.net').memcached) {
      // put results into memcached
      var requestKey = keyPrefix+req.headers.host+req.url;
      memcached.set(requestKey, data, 0, function(err, result) {
        if (err) {
          console.error(err);
        }
      }); 
    } else {
      // store results in memory
      cache[keyPrefix + req.headers.host + req.url] = data;

      setTimeout(function () {
        if (cache[keyPrefix + req.headers.host + req.url]) {
          delete cache[keyPrefix + req.headers.host + req.url];
        }
      }, config.getHost('dod.net').clean_memory * 3600 * 1000);
    }

    setTimeout(function () {
      data.timeout = true;

      if (config.getHost('dod.net').memcached) {
        // set results to timeout of memcached
        var requestKey = keyPrefix+req.headers.host+req.url;
        memcached.set(requestKey, data, 0, function(err, result) {
          if (err) {
            console.error(err);
          }
        }); 
      } else if (cache[keyPrefix + req.headers.host + req.url]) {
        cache[keyPrefix + req.headers.host + req.url] = data;
      }
    }, config.getHost('dod.net').cache_timeout * 1000);
  }
}
