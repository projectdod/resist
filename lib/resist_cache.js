"use strict";

var HashRing = require("hash_ring");
var Redis = require('redis');

var VERSION = '1';
var MOBILE  = 'm';

var _redis = {};
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
  "\\/wp-admin)", 'i');

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

function ResistCache(options) {
  if (false === (this instanceof ResistCache)) {
   return new ResistCache(options);
  }

  options           = options              || {};
  this.keyPrefix    = options.keyPrefix    || 'v' + VERSION + ':';
  this.cleanMemory  = options.cleanMemory  || 3600;
  this.debug        = options.debug        || 0;
  this.type         = options.type         || 'local';
  this.maxBodySize  = options.maxBodySize  || 26214400;
  this.timeout      = options.cacheTimeout || 300;
  this.cacheHost    = options.cacheHost    || "127.0.0.1";
  this.cachePort    = options.cachePort    || "6379";
  this.cacheNodes   = options.cacheNodes   || { "127.0.0.1:6379" : 1 };

  // use user specified redis or cache if they passed one in
  _cache            = options.cache        || _cache;
  _redis            = options.redis        || _redis;

  this.timestamp    = 0;
  this.bodySize     = 0;
  this.body         = [];

  // must scale this to seconds
  this.timeout     *= 1000;

  if (this.type === 'redis') {
    this.ring = new HashRing(this.cacheNodes);

    // If server are added to cacheNodes, open those connections
    for(var key in this.cacheNodes) {
      if (!(_redis[key])) {
        var server = key.split(":"); 

        // enable_offline_queue set to false usually causes the first
        // redis connection for each process to fail.  After that everything
        // is smooth, even if a redis server goes down.  It's best not to
        // restart the proxy when origin servers are down, but it won't kill
        // you.
        _redis[key] = Redis.createClient(server[1], server[0], {
          enable_offline_queue : false
        });

        _redis[key].on('error', function(err) {
          if (this.debug) {
            console.error(err);
          }
        }.bind(this));
      }
    }

    // If server are removed from cacheNodes, close those connections
    for(var key in _redis) {
      if (!(this.cacheNodes[key])) {
        _redis[key].quit();
        delete _redis[key];
      }
    }

    this.redis = _redis;
  }

  this.cache = _cache;
}

ResistCache.prototype.get = function (req, callback) {
  if (req) {
    this.setRequest(req);
  }

  if (!this.getRequest()) {
    throw new Error("Must setRequest() first");
  }

  if (!this.cacheOk()) {
    return callback();
  }

  if (this.redis) {
    // get our object out of redis
    var key = this.buildKey();
    this.redis[this.ring.getNode(key)].get(key, function(err, result) {
      if (err) {
        if (this.debug) {
          console.error("redis get(Cache.get) error: " + err);
        }
        return callback();
      } else if (result) {
        try {
          result = JSON.parse(result);
          this.setCode(result.code);
          this.setReason(result.reason);
          this.setHeaders(result.headers);
          this.setEncodedBody(result.body);
          this.clearBody();
          this.setBody(this.decodeBody(result.body));
          this.setTimestamp(result.timestamp);
          return callback(this);
        }
        catch (err) {
          if (this.debug) {
            console.error(err);
          }
          return callback();
        }
      } else {
        return callback();
      }
    }.bind(this));
  } else {
    // get our object out of memory
    if (this.cache[this.buildKey()]) {
      var result = this.cache[this.buildKey()];
      this.setCode(result.code);
      this.setReason(result.reason);
      this.setHeaders(result.headers);
      this.clearBody();
      this.setBody(result.body);
      this.setTimestamp(result.timestamp);
      return callback(this);
    } else {
      return callback();
    }
  }
};

ResistCache.prototype.set = function (res) {
  if (res) {
    this.setResponse(res);
  }

  if (!this.getRequest()) {
    throw new Error("Must setRequest() first");
  }

  if (!this.getResponse()) {
    throw new Error("Must setResponse() first");
  }

  if (!this.getCode()) {
    throw new Error("Must setCode() first");
  }

  if (!this.getHeaders()) {
    throw new Error("Must setHeaders() first");
  }

  if (!this.cacheOk()) {
    return;
  }

  if (this.getHeaders()) {
    var date = new Date();

    var blob = {
      'version'   : this.getVersion(),
      'code'      : this.getCode(),
      'reason'    : this.getReason(),
      'headers'   : this.getHeaders(),
      'body'      : this.getBody(),
      'timestamp' : date.getTime()
    };

    if (this.redis) {
      blob.body = this.encodeBody(blob.body);
      this.setEncodedBody(blob.body);

      // put results into redis
      var key = this.buildKey();
      this.redis[this.ring.getNode(key)].set(key, JSON.stringify(blob),
        function(err, result) {
          if (err) {
            if (this.debug) {
              console.error("redis set(Cache.set) error: " + err);
            }
          }
        }
      );
    } else {
      this.cache[this.buildKey()] = blob;

      // This is a little strange, but we delete the cache here.
      // If the record is updated using the update interface, this
      // timeout still stands.
      setTimeout(function () {
        if (this.cache[this.buildKey()]) {
          delete this.cache[this.buildKey()];
        }
      }.bind(this), this.getCleanMemory() * 1000);
    }
  }
};

ResistCache.prototype.update = function () {
  if (!this.getRequest()) {
    throw new Error("Must setRequest() first");
  }

  if (!this.getCode()) {
    throw new Error("Must setCode() first");
  }

  if (!this.getHeaders()) {
    throw new Error("Must setHeaders() first");
  }

  var date = new Date();

  var blob = {
    'version'   : this.getVersion(),
    'code'      : this.getCode(),
    'reason'    : this.getReason(),
    'headers'   : this.getHeaders(),
    'timestamp' : date.getTime()
  };

  if (this.redis) {
    blob.body = this.getEncodedBody();

    // put results into redis
    var key = this.buildKey();
    this.redis[this.ring.getNode(key)].set(key, JSON.stringify(blob),
      function(err, result) {
        if (err) {
          if (this.debug) {
            console.error("redis set(Cache.update) error: " + err);
          }
        }
      }
    );
  } else {
    blob.body = this.getBody();
    this.cache[this.buildKey()] = blob;
  }

  return;
};

ResistCache.prototype.getVersion = function () {
  return VERSION;
};

ResistCache.prototype.getVersionPrefix = function () {
  return 'v' + VERSION + ':';
};

ResistCache.prototype.getMobilePrefix = function () {
  return MOBILE + ':';
};

ResistCache.prototype.getCleanMemory = function () {
  return this.cleanMemory;
};

ResistCache.prototype.setCleanMemory = function (hours) {
  this.cleanMemory = hours;
};

ResistCache.prototype.getCode = function () {
  return this.code;
};

ResistCache.prototype.setCode = function (code) {
  this.code = code;
};

ResistCache.prototype.getReason = function () {
  return this.reason;
};

ResistCache.prototype.setReason = function (reason) {
  this.reason = reason;
};

ResistCache.prototype.getHeaders = function () {
  return this.headers;
};

ResistCache.prototype.setHeaders = function (headers) {
  this.headers = headers;
};

ResistCache.prototype.getMaxBodySize = function () {
  return this.maxBodySize;
};

ResistCache.prototype.setMaxBodySize = function (size) {
  this.maxBodySize = size;
};

ResistCache.prototype.getBodySize = function () {
  return this.bodySize;
};

ResistCache.prototype.setBodySize = function (size) {
  this.bodySize = size;
};

ResistCache.prototype.getBody = function () {
  return Buffer.concat(this.body);
};

ResistCache.prototype.setBody = function (body) {
  this.setBodySize(this.getBodySize() + body.length);
  if (this.getBodySize() <= this.getMaxBodySize()) {
    this.body.push(body);
  }
};

ResistCache.prototype.clearBody = function () {
  this.setBodySize(0);
  this.body = [];
};

ResistCache.prototype.getEncodedBody = function () {
  return this.encodedBody;
};

ResistCache.prototype.setEncodedBody = function (encodedBody) {
  this.encodedBody = encodedBody;
};

ResistCache.prototype.getTimestamp = function () {
  return this.timestamp;
};

ResistCache.prototype.setTimestamp = function (timestamp) {
  this.timestamp = timestamp; 
};

ResistCache.prototype.getKeyPrefix = function () {
  return this.keyPrefix;
};

ResistCache.prototype.setKeyPrefix = function (prefix) {
  this.keyPrefix = prefix;
};

ResistCache.prototype.getRequest = function () {
  return this.req;
};

ResistCache.prototype.setRequest = function (req) {
  if (mobile.test(req.headers['user-agent'])) {
    this.setKeyPrefix(this.getVersionPrefix() + this.getMobilePrefix());
  } else {
    this.setKeyPrefix(this.getVersionPrefix());
  }

  this.req = req;
};

ResistCache.prototype.getResponse = function () {
  return this.res;
};

ResistCache.prototype.setResponse = function (res) {
  this.res = res;
};

ResistCache.prototype.getDebug = function () {
  return this.debug;
};

ResistCache.prototype.setDebug = function (debug) {
  this.debug = debug;
};

ResistCache.prototype.buildKey = function () {
  return this.getKeyPrefix()
    + this.getRequest().method + ':'
    + this.getRequest().httpVersion + ':'
    + this.getRequest().headers.host + ':'
    + this.getRequest().url;
};

ResistCache.prototype.cacheOk = function () {
  // Find everything we should not cache.
  // XCAMX: more complete cache header treatment:
  // http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html 
  // http://palizine.plynt.com/issues/2008Jul/cache-control-attributes/
  if (this.getBodySize() > this.getMaxBodySize()) {
    return false;
  }

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
};

ResistCache.prototype.isStale = function () {
  var date = new Date();

  if ((date.getTime() - this.timestamp) > this.timeout) {
    return true;
  }

  return false;
};

ResistCache.prototype.encodeBody = function (buffer) {
  if (Buffer.isBuffer(buffer)) {
    return buffer.toString('base64');
  } else {
    return buffer;
  }
};

ResistCache.prototype.decodeBody = function (string) {
  if (typeof string === 'string') {
    return new Buffer(string, "base64");
  } else {
    return string;
  }
};

ResistCache.prototype.mergeHeaders = function (headers) {
  for (var key in headers) {
    this.headers[key] = headers[key];
  }
};

module.exports = ResistCache;
