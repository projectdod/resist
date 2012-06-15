#!/usr/bin/env node

var util      = require('util'),
    http      = require('http'),
    cluster   = require('cluster'),
    os        = require('os'),
    Memcached = require('memcached'),
    httpProxy = require('http-proxy'),
    Config    = require('./lib/config');

// Hardcoded regex for host+url nocache detection
//
// /comment-rating -- worpress comment plugin
// /wp-admin -- wordpress admin interface
// .mp3 -- audio files
// .avi -- movie files
// .mov -- movie files
// .wmv -- movie files
// .tar -- tarballs
// .gz -- anything gziped is likely large
// .jpa -- joomla import files are large
var noCache = new RegExp("(?:\\/comment-rating\\/[a-z-]+\\.php|" +
  "\\/wp-admin|\\.mp3|\\.avi|\\.mov|\\.wmv|\\.tar|\\.gz|\\.jpa|\\.mbox)", 'i');

// Hardcoded regex for cookie nocache detection
//
// wordpress_logged_in_ -- never cache logged in wordpress sessions
// comment_author_ -- never cache stuff from people that just commented
var noCacheCookie = new RegExp("(?:wordpress_logged_in_|" +
  "comment_author_)", 'i');

// Hardcoded mobile user agents that may produce different pages
// we will cache these as mobile.
//
// iPhone -- Apple iPhone
// iPod -- Apple iPod touch
// Android -- 1.5+ Android
// dream -- Pre 1.5 Android
// CUPCAKE -- 1.5+ Android
// blackberry -- lots of different blackberries
// webOS -- Palm Pre Experimental
// incognito -- Other iPhone browser
// webmate -- Other iPhone browser
// s8000 -- Samsung Dolphin browser
// bada -- Samsung Dolphin browser
var mobile = new RegExp("(?:iPhone|iPod|Android|dream|CUPCAKE|blackberry|" +
  "webOS|incognito|webmate|s8000|bada)", 'i');

//
// You should not need to change anything below this line, unless you know
// what you're doing.
//
var config;
var memcached;
var cpus = os.cpus().length;
var cache = new Object();

if (cluster.isMaster) {
  var welcome = "\
   +----------------------------------------------------------------------+\n\
   |..REVERSE.CACHING.PROXY..............................  _  ............|\n\
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
      "memcached"        : false
    });

    startResist();
  });
}

function startResist() {
  if (config.getHost('dod.net').memcached) {
    memcached = new Memcached('127.0.0.1:11211');
    memcached.on('issue', function(details) {
      console.error("got issue");
    });
    memcached.on('reconnected', function(details) {
      console.error("got reconnected");
    });
    memcached.on('remove', function(details) {
      console.error("got remove");
    });
    memcached.on('failure', function(details) {
      console.error("got failure");
    });
    memcached.on('reconnecting', function(details) {
      console.error("got reconnecting");
    });
  }

  var httpProxyServer = httpProxy.createServer(function (req, res, proxy) {
    var keyPrefix = '';
    var cacheOk = true;
    var buffer = false;
    var timeout = false;

    if (mobile.test(req.headers['user-agent'])) {
      keyPrefix = 'mobile-';
    }

    // Find everything we should not cache.
    if (req.method === 'POST' ||
        noCache.test(keyPrefix + req.headers.host + req.url) ||
        noCacheCookie.test(req.headers['cookie'])) {
      cacheOk = false;
    }

    var reqBuffer = httpProxy.buffer(req);
    var resBuffer = httpProxy.buffer(res);

    if (config.getHost('dod.net').memcached) {
      // get our object out of memcached
      var requestKey = keyPrefix+req.headers.host+req.url;
      memcached.get(requestKey, function(err, result) {
        if (err) {
          console.error(err);
        } else if (result) {
          buffer  = result.buffer;
          timeout = result.timeout;
        }

        _sendResult(res, req, proxy, cacheOk, buffer, timeout, reqBuffer);
      }); 
    } else {
      // get our object out of memory
      if (cache[keyPrefix + req.headers.host + req.url] &&
          cache[keyPrefix + req.headers.host + req.url].buffer) {
        buffer  = cache[keyPrefix + req.headers.host + req.url].buffer;
        timeout = cache[keyPrefix + req.headers.host + req.url].timeout;
      }

      _sendResult(res, req, proxy, cacheOk, buffer, timeout, reqBuffer);
    }
  });

  httpProxyServer.listen(config.getHost('dod.net').local_port);
}

function _sendResult(res, req, proxy, cacheOk, buffer, timeout, reqBuffer) {
  if (cacheOk && buffer) {
    res.end(buffer);

    // If we don't have to fetch again, just return here.  So fast!
    if (!(timeout)) {
      return;
    }

    // Oh this is total hacks so we don't have to change the core lib
    res.writeHead = function (arg1, arg2) {};
    res.write     = function () {};
    res.end       = function () {};
  }

  var options = {
    host             : config.getHost('dod.net').hostname,
    port             : config.getHost('dod.net').remote_port,
    enableXForwarded : config.getHost('dod.net').x_forwarded_for,
    maxSockets       : config.getHost('dod.net').max_sockets,
    buffer           : reqBuffer,
    cacheOk          : cacheOk
  };

  // Use some trick like this to get at the data for caching.
  //var _write = res.write;

  //res.write = function (data) {
  //    console.log(data.toString());
  //    _write.call(res, data);
  //}

  proxy.proxyRequest(req, res, options);
  proxy.on('end', _handleResponse);
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
