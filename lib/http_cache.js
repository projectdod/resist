"use strict";

var Memcached = require('memcached');

var VERSION = '1';
var MOBILE  = 'm';

var self = HttpCache;

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

  this.options      = options              || {};
  this.cache        = options.cache        || 0;
  this.cacheTimeout = options.cacheTimeout || 300;
  this.cleanMemory  = options.cleanMemory  || 1;
  this.type         = options.type         || 'local';
  this.host         = options.host         || "127.0.0.1:11211"; 
  this.keyPrefix    = options.keyPrefix    || 'v' + VERSION + ':';

  this.timestamp  = 0;
  this.body       = [];

  // must scale this to seconds
  this.cacheTimeout *= 1000;

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
    if (!options.cache) {
      throw new Error("Must define persistent storage in options.cache");
    }
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

HttpCache.prototype.get = function (req, callback) {
  if (req) {
    this.setRequest(req);
  }

  if (!this.getRequest()) {
    throw new Error("Must set req first, see setRequest()");
  }

  if (!this.cacheOk()) {
    callback();
  }

  if (this.memcached) {
    // get our object out of memcached
    this.memcached.get(this.buildKey(), function(err, result) {
      if (err) {
        console.error(err);
	callback();
      } else if (result) {
        this.timestamp = result.timestamp;
	result.body = new Buffer(result.body, "base64");
        callback(result);
      }
    }.bind(this));
  } else if (this.redis) {
    // get our object out of redis
    throw new Error("Redis cache not yet supported");
  } else {
    // get our object out of memory
    if (this.cache[this.buildKey()]) {
      this.timestamp = this.cache[this.buildKey()].timestamp;
      callback(this.cache[this.buildKey()]);
    }
  }
}

HttpCache.prototype.set = function (res) {
  if (res) {
    this.setResponse(res);
  }

  if (!this.getRequest()) {
    throw new Error("Must set req first, see setRequest()");
    return;
  }
  if (!this.getResponse()) {
    throw new Error("Must set res first, see setResponse()");
    return;
  }

  if (!this.cacheOk()) {
    return;
  }

  var bodyBuffer = this.getBody();

  if (bodyBuffer && bodyBuffer.length > 0) {
    var date = new Date();

    var blob = {
      'body'      : bodyBuffer,
      'code'      : this.getCode(),
      'headers'   : this.getHeaders(),
      'reason'    : this.getReason(),
      'timestamp' : date.getTime()
    };

    if (this.memcached) {
      blob.body = blob.body.toString('base64');

      // put results into memcached
      this.memcached.set(this.buildKey(), blob, 0, function(err, result) {
        if (err) {
          console.error(err);
        }
      });
    } else {
      this.cache[this.buildKey()] = blob;

      // This is a little strange, but we delete the cache here.
      setTimeout(function () {
        if (this.cache[this.buildKey()]) {
          delete this.cache[this.buildKey()];
        }
      }, this.getCleanMemory() * 3600 * 1000);
    }
  }

  return;
}

HttpCache.prototype.setCleanMemory = function (hours) {
  this.cleanMemory = hours;
}

HttpCache.prototype.getCleanMemory = function () {
  return this.cleanMemory;
}

HttpCache.prototype.setCode = function (code) {
  this.code = code;
}

HttpCache.prototype.getCode = function () {
  return this.code;
}

HttpCache.prototype.setReason = function (reason) {
  this.reason = reason;
}

HttpCache.prototype.getReason = function () {
  return this.reason;
}

HttpCache.prototype.setHeaders = function (headers) {
  this.headers = headers;
}

HttpCache.prototype.getHeaders = function () {
  return this.headers;
}

HttpCache.prototype.setBody = function (body) {
  this.body.push(body);
}

HttpCache.prototype.getBody = function () {
  return Buffer.concat(this.body);
}

HttpCache.prototype.getKeyPrefix = function () {
  return this.keyPrefix;
}

HttpCache.prototype.setKeyPrefix = function (prefix) {
  this.keyPrefix = prefix;
}

HttpCache.prototype.getRequest = function () {
  return this.req;
}

HttpCache.prototype.setRequest = function (req) {
  if (mobile.test(req.headers['user-agent'])) {
    this.setKeyPrefix(this.getVersionPrefix() + this.getMobilePrefix());
  } else {
    this.setKeyPrefix(this.getVersionPrefix());
  }

  this.req = req;
}

HttpCache.prototype.getResponse = function () {
  return this.res;
}

HttpCache.prototype.setResponse = function (res) {
  this.res = res;
}

HttpCache.prototype.buildKey = function () {
  return this.getKeyPrefix()
    + this.getRequest().headers.host
    + this.getRequest().url;
}

HttpCache.prototype.cacheOk = function (key) {
  // Find everything we should not cache.
  // XXX: more complete cache header treatment:
  // http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html 
  // http://palizine.plynt.com/issues/2008Jul/cache-control-attributes/
  if (this.getRequest()
      && (this.getRequest().method === 'POST'
          || noCache.test(this.buildKey())
          || noCacheCookie.test(this.getRequest().headers['cookie'])
          || this.getRequest().headers['cache-control'] === 'no-cache')) {
    return false;
  }

  if (this.getResponse()
      && (this.getResponse().getHeader('cache-control') === 'no-cache'
          || this.getResponse().statusCode >= 400)) {
    return false;
  }

  return true;
}

HttpCache.prototype.isStale = function () {
  var date = new Date();

  if ((date.getTime() - this.timestamp) > this.cacheTimeout) {
    return true;
  }

  return false;
}

module.exports = HttpCache;
