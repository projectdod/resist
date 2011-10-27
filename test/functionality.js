var testCase = require('nodeunit').testCase;

module.exports.bar = testCase({
    setUp: function (callback) {
        this.foo = 'bar';
        callback();
    },
    tearDown: function (callback) {
        // clean up
        callback();
    },
    test1: function (test) {
        test.expect(1);
        test.equals(this.foo, 'bar');
        test.done();
    }
});

module.exports.baz = testCase({
    setUp: function (callback) {
        this.foo = 'baz';
        callback();
    },
    tearDown: function (callback) {
        // clean up
        callback();
    },
    test1: function (test) {
        test.expect(1);
        test.equals(this.foo, 'baz');
        test.done();
    }
});
