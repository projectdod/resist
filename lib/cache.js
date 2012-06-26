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

function Cache(options) {
  if (false === (this instanceof Cache)) {
   return new Cache(options);
  }

  this.options    = options           || {};
  this.cache      = options.cache     || new Object();
  this.type       = options.type      || 'local';
  this.host       = options.host      || "127.0.0.1:11211"; 
  this.keyPrefix  = options.keyPrefix || 'v' + VERSION + ':';

  this.timestamp  = 0;

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

Cache.prototype.getVersion = function () {
  return VERSION;
}

Cache.prototype.getVersionPrefix = function () {
  return 'v' + VERSION + ':';
}

Cache.prototype.getMobilePrefix = function () {
  return MOBILE + ':';
}

Cache.prototype.get = function (req) {
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
        return result.buffer;
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
      return cache[this.buildKey()].buffer;
    }
  }

  return;
}

Cache.prototype.set = function (value) {
  // Flesh me out
  return;
}

Cache.prototype.getKeyPrefix = function () {
  return this.keyPrefix;
}

Cache.prototype.setKeyPrefix = function (key) {
  this.keyPrefix = keyPrefix;
}

Cache.prototype.getRequest = function () {
  return this.req;
}

Cache.prototype.setRequest = function (req) {
  if (mobile.test(this.req.headers['user-agent'])) {
    this.setKeyPrefix(this.getVersionPrefix() + this.getMobilePrefix());
  } else {
    this.setKeyPrefix(this.getVersionPrefix());
  }

  this.req = req;
}

Cache.prototype.buildKey = function () {
  return this.getKeyPrefix() + this.req.headers.host + this.req.url;
}

Cache.prototype.cacheOk = function (key) {
  // Find everything we should not cache.
  if (this.req.method === 'POST' || noCache.test(this.buildKey()) ||
      noCacheCookie.test(this.req.headers['cookie'])) {
    return false;
  }

  return true;
}

Cache.prototype.isStale = function () {
  var date = new Date();

  if ((date.getTime() - this.timestamp) > 0) {
    return false;
  }

  return true;
}

module.exports = Cache;
