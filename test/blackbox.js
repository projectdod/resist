var stub = require("./fixtures/stub");

function _set_up(callback) {
  this.backup = {};
  this.backup.jsonParse = JSON.parse;
  // this.resist = require("../resist.js");

  callback();
}

function _tear_down(callback) {
  JSON.parse = this.backup.jsonParse;

  callback();
}

exports.blackbox = {
  setUp : _set_up,
  tearDown : _tear_down,
  'testing resist startup' : function (test) {
    test.expect(1);
    test.ok(true);
    test.done();
  }
};
