"use strict";

var Gossiper = require('gossiper').Gossiper,
    ResistCrypt = require('./resist_crypt');

function Config(listenCallback) {
  if (false === (this instanceof Config)) {
    return new Config(listenCallback);
  }

  this.resistCrypt = new ResistCrypt();

  // XXX: read seeds from a config file, and write new peers as we find them.
  // XXX: make sure to handle connection errors here.
  this.gossip = new Gossiper(7001, ['127.0.0.1:7000']);
  this.gossip.start(function () {
    listenCallback.call(this);
  }.bind(this));

  this.hostConfig = {};

  this.gossip.on('update', function(peer, key, value) {
    if (key !== '__heartbeat__') {
      var data = this.resistCrypt.decrypt(peer, key, value);

      if (this.resistCrypt.validate(peer, key, data)) {
        // XXX: add stats collection and logging here
        // console.log("CONFIG: peer " + peer + " set " + key + " to " + value);
        // console.log(value);
        this.setHost(key, data);
      }
    }
  }.bind(this));
}

// XXX: This should be a host get function
Config.prototype.getHost = function (host) {
  if (this.hostConfig[host]) {
    return this.hostConfig[host];
  } else {
    return null;
  }
};

// XXX: This should be a host set function
Config.prototype.setHost = function (host, configuration) {
  configuration = this.resistCrypt.sign(host, configuration);
  var ciphertext = this.resistCrypt.encrypt(host, configuration);
  this.hostConfig[host] = configuration;
  this.gossip.setLocalState(host, ciphertext);
};

// XXX: Make a user get function
// XXX: Make a user set function
// XXX: Make a peer get function
// XXX: Make a peer set function
Config.prototype.destroy = function () {
  this.gossip.stop();
};

module.exports = Config;
