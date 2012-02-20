require("function-bind");

var Config = require("config"),
    Gossiper = require('gossiper').Gossiper,
    stub = require("test/fixtures/stub");

var seed = new Gossiper(7000, [], '127.0.0.1');

function _set_up(callback) {
  this.backup = {};
  this.backup.jsonParse = JSON.parse;

  seed.start(function () {
    this.config = new Config(function () {
      callback();
    });
  }.bind(this));
}

function _tear_down(callback) {
  JSON.parse = this.backup.jsonParse;
  seed.stop();
  this.config.destroy();

  callback();
}

exports.config = {
  setUp : _set_up,
  tearDown : _tear_down,
  'testing Config is a class' : function (test) {
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
    var gossiper = new Gossiper(7002, ['127.0.0.1:7000'], '127.0.0.1');
    gossiper.start();

    setTimeout(function() {
      var data = this.config.get('dod.net');

      test.expect(3);
      test.isNotNull(data);
      test.isObject(data);
      test.equals(data.hostname, 'darkside.dod.net');
      test.done();
      gossiper.stop();
    }.bind(this), 10000);

    gossiper.setLocalState("dod.net", {
      "hostname"      : "darkside.dod.net",
      "remote_port"   : 80,
      "local_port"    : 8000,
      "cache_timeout" : 300,
      "clean_memory"  : 2,
      "memcached"     : false
    });
  }
};
