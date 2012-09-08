"use strict";

var Memcached = require('memcached');

var VERSION = '1';
var MOBILE  = 'm';

var _memcached;
var _cache = {};

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
  this.keyPrefix    = options.keyPrefix    || 'v' + VERSION + ':';
  this.cleanMemory  = options.cleanMemory  || 1;
  this.type         = options.type         || 'local';
  this.timeout      = options.timeout      || 300;
  this.cacheHost    = options.cacheHost    || "127.0.0.1:11211"; 

  // use user specified memcached or cache if they passed one in
  _cache            = options.cache        || _cache;
  _memcached        = options.memcached    || _memcached;

  this.timestamp    = 0;
  this.body         = [];

  // must scale this to seconds
  this.timeout     *= 1000;


  if (this.type === 'memcached') {
    if (!_memcached) {
      _memcached = new Memcached(this.cacheHost, {
        poolSize : 4096,
        retries  : 32,
        timeout  : 3000,
        maxValue : 26214400,
      });

      _memcached.on('issue', function(details) {
        console.error("issue:");
        console.error(details);
      });

      _memcached.on('reconnected', function(details) {
        console.error("reconnected:");
        console.error(details);
      });

      _memcached.on('remove', function(details) {
        console.error("remove:");
        console.error(details);
      });

      _memcached.on('failure', function(details) {
        console.error("failure:");
        console.error(details);
      });

      _memcached.on('reconnecting', function(details) {
        console.error("reconnecting:");
        console.error(details);
      });
    }

    this.memcached = _memcached;
  }

  this.cache = _cache;
}

HttpCache.prototype.get = function (req, callback) {
  if (req) {
    this.setRequest(req);
  }

  if (!this.getRequest()) {
    throw new Error("Must set req first, see setRequest()");
  }

  if (!this.cacheOk()) {
    return callback();
  }

  if (this.memcached) {
    // get our object out of memcached
    this.memcached.get(this.buildKey(), function(err, result) {
      if (err) {
        console.error("memcached get(Cache.get) error: " + err);
        return callback();
      } else if (result) {
        result.body = new Buffer(result.body, "base64");
        this.timestamp = result.timestamp;
        return callback(result);
      } else {
        return callback();
      }
    }.bind(this));
  } else {
    // get our object out of memory
    if (this.cache[this.buildKey()]) {
      this.timestamp = this.cache[this.buildKey()].timestamp;
      return callback(this.cache[this.buildKey()]);
    } else {
      return callback();
    }
  }
}

HttpCache.prototype.set = function (res) {
  if (res) {
    this.setResponse(res);
  }
  if (!this.getRequest()) {
    throw new Error("Must set req first, see setRequest()");
  }
  if (!this.getResponse()) {
    throw new Error("Must set res first, see setResponse()");
  }

  if (!this.cacheOk()) {
    return;
  }

  if (this.getHeaders()) {
    var date = new Date();

    var blob = {
      'body'      : this.getBody(),
      'code'      : this.getCode(),
      'headers'   : this.getHeaders(),
      'reason'    : this.getReason(),
      'timestamp' : date.getTime()
    };

    if (this.memcached) {
      blob.body = blob.body.toString('base64');

console.log("START " + this.buildKey());
      // put results into memcached
      this.memcached.set(this.buildKey(), blob, 0, function(err, result) {
        if (err) {
          console.error("memcached set(Cache.set) error: " + err);
        } else {
          console.log("END " + this.buildKey());
        }
      }.bind(this));
    } else {
      this.cache[this.buildKey()] = blob;

      // This is a little strange, but we delete the cache here.
      // If the record is updated using the update interface, this
      // timeout still stands.
      setTimeout(function () {
        if (this.cache[this.buildKey()]) {
          delete this.cache[this.buildKey()];
        }
      }, this.getCleanMemory() * 3600 * 1000);
    }
  }
}

HttpCache.prototype.update = function (blob) {
  if (!this.getRequest()) {
    throw new Error("Must set req first, see setRequest()");
  }

  var date = new Date();

  blob.timestamp = date.getTime();

  if (this.memcached) {
    blob.body = blob.body.toString('base64');

    // put results into memcached
    this.memcached.set(this.buildKey(), blob, 0, function(err, result) {
      if (err) {
        console.error("memcached set(Cache.update) error: " + err);
      }
    });
  } else {
    this.cache[this.buildKey()] = blob;
  }

  return;
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

HttpCache.prototype.getCleanMemory = function () {
  return this.cleanMemory;
}

HttpCache.prototype.setCleanMemory = function (hours) {
  this.cleanMemory = hours;
}

HttpCache.prototype.getCode = function () {
  return this.code;
}

HttpCache.prototype.setCode = function (code) {
  this.code = code;
}

HttpCache.prototype.getReason = function () {
  return this.reason;
}

HttpCache.prototype.setReason = function (reason) {
  this.reason = reason;
}

HttpCache.prototype.getHeaders = function () {
  return this.headers;
}

HttpCache.prototype.setHeaders = function (headers) {
  this.headers = headers;
}

HttpCache.prototype.getBody = function () {
  return Buffer.concat(this.body);
}

HttpCache.prototype.setBody = function (body) {
  this.body.push(body);
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
    + this.getRequest().method + ':'
    + this.getRequest().httpVersion + ':'
    + this.getRequest().headers.host + ':'
    + this.getRequest().url;
}

HttpCache.prototype.cacheOk = function () {
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
          || (this.getResponse().statusCode != 200
            && this.getResponse().statusCode != 203
            && this.getResponse().statusCode != 300
            && this.getResponse().statusCode != 301
            && this.getResponse().statusCode != 410))) {
    return false;
  }

  return true;
}

HttpCache.prototype.isStale = function () {
  var date = new Date();

  if ((date.getTime() - this.timestamp) > this.timeout) {
    return true;
  }

  return false;
}

module.exports = HttpCache;
