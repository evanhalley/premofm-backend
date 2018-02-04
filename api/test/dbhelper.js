var assert 		= require('assert');
var winston 	= require('winston');
var ObjectID 	= require("mongodb").ObjectID;

GLOBAL.config = require('../conf/unit-tst.config.js');

/* Logger configuration */
var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({ json: false, timestamp: true, colorize: true, level: config.logger.level }),
		new winston.transports.File({ filename: config.logger.path + config.logger.file, json: false, colorize: true, level: config.logger.level })
	],
	exceptionHandlers: [
		new (winston.transports.Console)({ json: false, timestamp: true, colorize: true, level: config.logger.level }),
		new winston.transports.File({ filename: config.logger.path + config.logger.file, json: false, colorize: true, level: config.logger.level })
	],
	exitOnError: true
});
GLOBAL.logger = logger;

var dbHelper = require("../helpers/dbhelper.js");

describe('DbHelper', function() {

	describe('ObjectArrayToMap', function() {

		it('Should turn array of objects into map', function(done) {
			var arr = [
				{
					"_id" : new ObjectID("123456789012345678901234"),
				},
				{
					"_id" : new ObjectID("098765432109876543210987"),
				}
			];
			var map = dbHelper.objectArrayToMap(arr);
			assert.equal(2, Object.keys(map).length);
			done();
		});

		it('Should return an empty map', function(done) {
			var arr = null;
			var map = dbHelper.objectArrayToMap(arr);
			assert.equal(0, Object.keys(map).length);
			done();
		});
	});

	describe('ConvertToHexStringArray', function() {
		
		it('Should turn array of object IDs to hex string array', function(done) {
			var arr = [ new ObjectID(), new ObjectID() ]
			var hexArr = dbHelper.convertToHexStringArray(arr);
			assert.equal(2, hexArr.length);
			done();
		});

		it('Should return empty list for null input', function(done) {
			var hexArr = dbHelper.convertToHexStringArray(null);
			assert.equal(0, hexArr.length);
			done();
		});

		it('Should return empty list for empty input', function(done) {
			var hexArr = dbHelper.convertToHexStringArray([]);
			assert.equal(0, hexArr.length);
			done();
		});
	});

	describe('HexStringArrayToObjectIdArray', function() {
		
		it('Should turn array of hex. strings to an object ID array', function(done) {
			var arr = [ new ObjectID().toHexString(), new ObjectID().toHexString() ];
			var objectIdArr = dbHelper.hexStringArrayToObjectIdArray(arr);
			assert.equal(2, objectIdArr.length);
			done();
		});

		it('Should return empty list for null input', function(done) {
			var objectIdArr = dbHelper.hexStringArrayToObjectIdArray(null);
			assert.equal(0, objectIdArr.length);
			done();
		});

		it('Should return empty list for empty input', function(done) {
			var objectIdArr = dbHelper.hexStringArrayToObjectIdArray([]);
			assert.equal(0, objectIdArr.length);
			done();
		});
	});

	describe('ObjectArrayToHexStringArray', function() {
		
		it('Should turn array of hex. strings to an object ID array', function(done) {
			var arr = [ { _id : new ObjectID() }, { _id : new ObjectID() } ];
			var objectIdArr = dbHelper.objectArrayToHexStringArray(arr);
			assert.equal(2, objectIdArr.length);
			done();
		});

		it('Should return empty list for null input', function(done) {
			var objectIdArr = dbHelper.objectArrayToHexStringArray(null);
			assert.equal(0, objectIdArr.length);
			done();
		});

		it('Should return empty list for empty input', function(done) {
			var objectIdArr = dbHelper.objectArrayToHexStringArray([]);
			assert.equal(0, objectIdArr.length);
			done();
		});
	});
});