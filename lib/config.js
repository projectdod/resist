"use strict";

function Config() {
  this.config = {
    "dod.net" : {
      "hostname"      : "darkside.dod.net",
      "remote_port"   : 80,
      "local_port"    : 8000,
      "cache_timeout" : 300,
      "clean_memory"  : 2,
      "memcached"     : false
    }
  };

  if (false === (this instanceof Config )) {
    return new Config();
  }
}

// just a stub for now.
Config.prototype.get = function (host) {
  if (this.config[host]) {
    return this.config[host];
  } else {
    return null;
  }
};

module.exports = Config;
