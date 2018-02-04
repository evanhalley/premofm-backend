var assert = require('assert');
var validationHelper = require("../helpers/validationhelper.js");

describe('ValidationHelper', function() {

	describe('Is valid', function() {

		it('is valid', function(done) {
			assert.equal(true, validationHelper.isNumber(10));
			assert.equal(true, validationHelper.isNumber(0));
			assert.equal(true, validationHelper.isValid("null"));
			assert.equal(true, validationHelper.isValid("undefined"));
			done();	
		});

		it('is not valid', function(done) {
			assert.equal(false, validationHelper.isNumber(null));
			assert.equal(false, validationHelper.isNumber(undefined));
			done();	
		});
	});

	describe('Number validation', function() {

		it('is a number', function(done) {
			assert.equal(true, validationHelper.isNumber(10));
			assert.equal(true, validationHelper.isNumber(0));
			assert.equal(true, validationHelper.isNumber(-10));
			assert.equal(true, validationHelper.isNumber(-81231));
			done();	
		});

		it('is not a number', function(done) {
			assert.equal(false, validationHelper.isNumber("hello"));
			assert.equal(false, validationHelper.isNumber(null));
			assert.equal(false, validationHelper.isNumber(undefined));
			assert.equal(false, validationHelper.isNumber("1234ed"));
			done();	
		});
	});

	describe('Array validation', function() {

		it('is not empty array', function(done) {
			assert.equal(false, validationHelper.isArrayEmpty([1, 2, 3, 4]));
			assert.equal(false, validationHelper.isArrayEmpty(["123", "432", "asd"]));
			assert.equal(false, validationHelper.isArrayEmpty(["123"]));
			done();	
		});

		it('is not a number', function(done) {
			assert.equal(true, validationHelper.isArrayEmpty(null));
			assert.equal(true, validationHelper.isArrayEmpty(undefined));
			assert.equal(true, validationHelper.isArrayEmpty([]));
			assert.equal(true, validationHelper.isArrayEmpty(""));
			assert.equal(true, validationHelper.isArrayEmpty("2422"));
			done();	
		});
	});
});