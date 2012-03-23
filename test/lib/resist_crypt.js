var ResistCrypt = require("../../lib/resist_crypt"),
    stub = require("../fixtures/stub");

function _set_up(callback) {
  this.backup = {};
  this.backup.jsonParse = JSON.parse;
  this.resistCrypt = new ResistCrypt();

  callback();
}

function _tear_down(callback) {
  JSON.parse = this.backup.jsonParse;

  callback();
}

exports.resist_crypt = {
  setUp : _set_up,
  tearDown : _tear_down,
  'testing ResistCrypt module' : function (test) {
    test.expect(2);
    test.isNotNull(ResistCrypt);
    test.isFunction(ResistCrypt);
    test.done();
  },
  'should be object' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCrypt);
    test.isObject(this.resistCrypt);
    test.done();
  },
  'should have encrypt method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCrypt.encrypt);
    test.isFunction(this.resistCrypt.encrypt);
    test.done();
  },
  'should have decrypt method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCrypt.decrypt);
    test.isFunction(this.resistCrypt.decrypt);
    test.done();
  },
  'should have sign method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCrypt.sign);
    test.isFunction(this.resistCrypt.sign);
    test.done();
  },
  'should have validate method' : function (test) {
    test.expect(2);
    test.isNotNull(this.resistCrypt.validate);
    test.isFunction(this.resistCrypt.validate);
    test.done();
  }
};
