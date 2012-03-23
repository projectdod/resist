#!/usr/bin/env node

var util = require('util');
var http = require('http');
var httpProxy = require('./lib/proxy');
var Config = require('./lib/config');

//
// You should not need to change anything below this line, unless you know
// what you're doing.
//
var config = new Config(function () {
  config.setHost("dod.net", {
    "hostname"      : "darkside.dod.net",
    "remote_port"   : 80,
    "local_port"    : 8000,
    "cache_timeout" : 300,
    "clean_memory"  : 2,
    "memcached"     : false
  });

  start_resist();
});

var cache = new Object();
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
var no_cache = new RegExp("(?:\\/comment-rating\\/[a-z-]+\\.php|" +
  "\\/wp-admin|\\.mp3|\\.avi|\\.mov|\\.wmv|\\.tar|\\.gz|\\.jpa|\\.mbox)", 'i');

// Hardcoded regex for cookie nocache detection
//
// wordpress_logged_in_ -- never cache logged in wordpress sessions
// comment_author_ -- never cache stuff from people that just commented
var no_cache_cookie = new RegExp("(?:wordpress_logged_in_|" +
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

function start_resist() {
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
  var http_server = httpProxy.createServer(function (req, res, proxy) {
    var key_prefix = '';
    var cache_ok = true;
    var buffer = false;
    var timeout = false;

    if (mobile.test(req.headers['user-agent'])) {
      key_prefix = 'mobile-';
    }

    // Find everything we should not cache.
    if (req.method === 'POST' ||
        no_cache.test(key_prefix + req.headers.host + req.url) ||
        no_cache_cookie.test(req.headers['cookie'])) {
      cache_ok = false;
    }

    if (config.getHost('dod.net').memcached) {
     // get our object out of memcached
    } else {
      if (cache[key_prefix + req.headers.host + req.url] &&
          cache[key_prefix + req.headers.host + req.url].buffer) {
        buffer  = cache[key_prefix + req.headers.host + req.url].buffer;
        timeout = cache[key_prefix + req.headers.host + req.url].timeout;
      }
    }

    if (cache_ok && buffer) {
      util.puts('loading ' + key_prefix + req.headers.host + req.url +
        ' out of cache.');

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

    if (cache_ok) {
      if (timeout) {
        util.puts('loading ' + key_prefix + req.headers.host + req.url +
          ' off of the origin server. ' + '(background)');
      } else {
        util.puts('loading ' + key_prefix + req.headers.host + req.url +
          ' off of the origin server.');
      }
    } else {
      util.puts('loading ' + key_prefix + req.headers.host + req.url +
        ' off of the origin server. ' + '(nocache)');
    }

    proxy.proxyRequest(req, res, {
      host             : config.getHost('dod.net').hostname,
      port             : config.getHost('dod.net').remote_port,
      enableXForwarded : true,
      cacheOk          : cache_ok
    });
  });

  http_server.listen(config.getHost('dod.net').local_port);

  http_server.proxy.on('end', function (req, res, buffer) {
    var key_prefix = '';

    if (mobile.test(req.headers['user-agent'])) {
      key_prefix = 'mobile-';
    }

    // if cache_ok was false, this is always 0
    if (buffer.length > 0) {
      if (config.getHost('dod.net').memcached) {
        // put results into memcached
      } else {
        // store results in memory
        cache[key_prefix + req.headers.host + req.url] = {
          'buffer'    : buffer,
          'timeout'   : false
        };
      }

      setTimeout(function () {
        if (config.getHost('dod.net').memcached) {
         // set results to timeout of memcached
        } else if (cache[key_prefix + req.headers.host + req.url]) {
          cache[key_prefix + req.headers.host + req.url].timeout = true;

          util.puts('setting ' + key_prefix + req.headers.host +
           req.url + ' to clear from cache.');
        }
      }, config.getHost('dod.net').cache_timeout * 1000);

      if (!(config.getHost('dod.net').memcached)) {
        setTimeout(function () {
          if (cache[key_prefix + req.headers.host + req.url]) {
            delete cache[key_prefix + req.headers.host + req.url];

            util.puts('clearing ' + key_prefix + req.headers.host + req.url +
             ' from cache.');
          }
        }, config.getHost('dod.net').clean_memory * 3600 * 1000);
      }
    }
  });
}
