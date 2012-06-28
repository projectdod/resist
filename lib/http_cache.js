"use strict";

var Memcached = require('memcached');

var VERSION = '1';
var MOBILE  = 'm';

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

function HttpCache(options) {
  if (false === (this instanceof HttpCache)) {
   return new HttpCache(options);
  }

  this.options    = options           || {};
  this.cache      = options.cache     || new Object();
  this.type       = options.type      || 'local';
  this.host       = options.host      || "127.0.0.1:11211"; 
  this.keyPrefix  = options.keyPrefix || 'v' + VERSION + ':';

  this.timestamp  = 0;
  this.body       = [];

  if (this.type === 'memcached') {
    this.memcached = new Memcached(this.host);

    this.memcached.on('issue', function(details) {
      console.error("got issue");
    });

    this.memcached.on('reconnected', function(details) {
      console.error("got reconnected");
    });

    this.memcached.on('remove', function(details) {
      console.error("got remove");
    });

    this.memcached.on('failure', function(details) {
      console.error("got failure");
    });

    this.memcached.on('reconnecting', function(details) {
      console.error("got reconnecting");
    });
  } else if (this.type === 'redis') {
    throw new Error("Redis cache not yet supported");
    return;
  } else {
  }
}

HttpCache.prototype.getVersion = function () {
  return VERSION;
}

HttpCache.prototype.getVersionPrefix = function () {
  return 'v' + VERSION + ':';
}

HttpCache.prototype.getMobilePrefix = function () {
  return MOBILE + ':';
}

HttpCache.prototype.get = function (req) {
  if (req) {
    this.setRequest(req);
  }

  if (!this.getRequest()) {
    throw new Error("Must set req first, see setRequest()");
    return;
  }

  if (!this.cacheOk()) {
    return;
  }

  if (this.memcached) {
    // get our object out of memcached
    memcached.get(this.buildKey(), function(err, result) {
      if (err) {
        console.error(err);
      } else if (result) {
        this.timestamp = result.timestamp;
        return result.data;
      }
    });
  } else if (this.redis) {
    // get our object out of redis
    throw new Error("Redis cache not yet supported");
    return;
  } else {
    // get our object out of memory
    if (this.cache[this.buildKey()] &&
        this.cache[this.buildKey()].buffer) {
      this.timestamp = cache[this.buildKey()].timestamp;
      return cache[this.buildKey()].data;
    }
  }

  return;
}

HttpCache.prototype.set = function (value) {
  if (!this.getRequest()) {
    throw new Error("Must set req first, see setRequest()");
    return;
  }

// XXX: rewrite made it to here.

  // check no cache headers too
  if (!this.cacheOk()) {
    return;
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
  return;
}

HttpCache.prototype.setCode = function (code) {
  this.code = code;
}

HttpCache.prototype.setReason = function (reason) {
  this.reason = reason;
}

HttpCache.prototype.setHeaders = function (headers) {
  this.headers = headers;
}

HttpCache.prototype.setBody = function (body) {
  this.body.push(body);
}

HttpCache.prototype.getKeyPrefix = function () {
  return this.keyPrefix;
}

HttpCache.prototype.setKeyPrefix = function (key) {
  this.keyPrefix = keyPrefix;
}

HttpCache.prototype.getRequest = function () {
  return this.req;
}

HttpCache.prototype.setRequest = function (req) {
  if (mobile.test(this.req.headers['user-agent'])) {
    this.setKeyPrefix(this.getVersionPrefix() + this.getMobilePrefix());
  } else {
    this.setKeyPrefix(this.getVersionPrefix());
  }

  this.req = req;
}

HttpCache.prototype.buildKey = function () {
  return this.getKeyPrefix() + this.req.headers.host + this.req.url;
}

HttpCache.prototype.cacheOk = function (key) {
  // Find everything we should not cache.
  if (this.req.method === 'POST' || noCache.test(this.buildKey()) ||
      noCacheCookie.test(this.req.headers['cookie'])) {
    return false;
  }

  return true;
}

HttpCache.prototype.isStale = function () {
  var date = new Date();

  if ((date.getTime() - this.timestamp) > 0) {
    return false;
  }

  return true;
}

module.exports = HttpCache;
