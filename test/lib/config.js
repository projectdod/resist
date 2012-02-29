var Config = require("config"),
    Gossiper = require('gossiper').Gossiper,
    stub = require("test/fixtures/stub");

var seed;

function _set_up(callback) {
  var config = this;

  // make backups
  this.backup = {};
  this.backup.config = {};
  this.backup.config.gossip = {};
  this.backup.jsonParse = JSON.parse;

  seed = new Gossiper(7000, [], '127.0.0.1');
  seed.start(function () {
    this.config = new Config(function () {
      this.backup.config.gossip.stop = this.config.gossip.stop;
      this.config.gossip.stop = stub();
      callback();
    }.bind(this));
  }.bind(this));
}

function _tear_down(callback) {
  // restore from backups
  this.config.gossip.stop = this.backup.config.gossip.stop;
  JSON.parse = this.backup.jsonParse;

  seed.stop();
  this.config.destroy();

  callback();
}

exports.config = {
  setUp : _set_up,
  tearDown : _tear_down,
  'testing Config module' : function (test) {
    test.expect(2);
    test.isNotNull(Config);
    test.isFunction(Config);
    test.done();
  },
  'should be object' : function (test) {
    test.expect(2);
    test.isNotNull(this.config);
    test.isObject(this.config);
    test.done();
  },
  'should have a get method' : function (test) {
    test.expect(2);
    test.isNotNull(this.config.get);
    test.isFunction(this.config.get);
    test.done();
  },
  'get should return null with bad host' : function (test) {
    var data = this.config.get('fail');

    test.expect(1);
    test.isNull(data);
    test.done();
  },
  'get should return sane data' : function (test) {
    var count = 0;
    var gossiper = new Gossiper(7002, ['127.0.0.1:7000'], '127.0.0.1');
    gossiper.start();

    // jackass test, but we need to see the config move through
    // gossip protocol into our config object.
    var test_get = function () {
      var data = this.config.get('dod.net');

      if (data || count > 20) {
        test.expect(3);
        test.isNotNull(data);
        test.isObject(data);
        test.equals(data.hostname, 'darkside.dod.net');
        test.done();

        gossiper.stop();
      } else {
        count++;
        setTimeout(test_get.bind(this), 1000);
      }
    };

    setTimeout(test_get.bind(this), 1000);

    gossiper.setLocalState("dod.net", {
      "hostname"      : "darkside.dod.net",
      "remote_port"   : 80,
      "local_port"    : 8000,
      "cache_timeout" : 300,
      "clean_memory"  : 2,
      "memcached"     : false
    });
  },
  'should have a set method' : function (test) {
    test.expect(2);
    test.isNotNull(this.config.set);
    test.isFunction(this.config.set);
    test.done();
  },
  'set should mutate config local and on peers' : function (test) {
    var count = 0;
    var gossiper = new Gossiper(7002, ['127.0.0.1:7000'], '127.0.0.1');
    gossiper.start(function () {
      gossiper.on('update', function(peer, key, value) {
        if (key !== '__heartbeat__') {
          gossiper.setLocalState(key, value);
        }
      });

      this.config.set("dod.net", {
        "hostname"      : "testing.dod.net",
        "remote_port"   : 80,
        "local_port"    : 8000,
        "cache_timeout" : 300,
        "clean_memory"  : 2,
        "memcached"     : false
      });
    }.bind(this));

    // jackass test, but we need to see the config move through
    // gossip protocol to our peers.
    var test_set = function () {
      var data = gossiper.getLocalState("dod.net");

      if (data || count > 20) {
        test.expect(6);
        test.isNotNull(data);
        test.isObject(data);
        test.equals(data.hostname, 'testing.dod.net');
        data = this.config.get('dod.net');
        test.isNotNull(data);
        test.isObject(data);
        test.equals(data.hostname, 'testing.dod.net');
        test.done();

        gossiper.stop();
      } else {
        count++;
        setTimeout(test_set.bind(this), 1000);
      }
    };

    setTimeout(test_set.bind(this), 1000);
  },
  'should have a destroy method' : function (test) {
    test.expect(2);
    test.isNotNull(this.config.destroy);
    test.isFunction(this.config.destroy);
    test.done();
  },
  'destroy method should stop gossip' : function (test) {
    this.config.destroy();

    test.expect(1);
    test.ok(this.config.gossip.stop.called);
    test.done();
  }
};
