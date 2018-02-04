var winston 	= require('winston');
var assert 		= require('assert');
var ObjectID 	= require("mongodb").ObjectID;
var moment		= require("moment");
GLOBAL.config 	= require('../conf/unit-tst.config.js');

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

var mongo = require("../mongo.js");
var device = require("../routes/device.js");
var apiHelper = require("../helpers/apihelper.js");
var userModel = require("../models/usermodel.js");

var token = "12345";
var basicAuth = null;

describe('Device', function() {
	var testUser1 = null;
	var internalUserId = null;

	before(function(done) {
		mongo.init(function(error) {
			mongo.collections.user.remove({}, function() {
				mongo.collections.token.remove({}, function() {
					var user = {
						"email": "testUser1@testman.com",
						"password" : "abc123"
					};
					userModel.createUser(user, function(err, user) {

						userModel.addAuthToken(user._id.toHexString(), token, function(err, success) {
							internalUserId = user._id.toHexString();
							var userId = apiHelper.toExternalId(user._id.toHexString());
							basicAuth = new Buffer(userId + ":" + token).toString('base64');
							done();
						});
					});
				});
			});
		});
	});

	describe('Device ID Validation', function() {

		/*it('should not validate', function(done) {
			assert.equal(device.isDeviceValid({}), false);
			assert.equal(device.isDeviceValid({'deviceId':'1234'}), false);
			assert.equal(device.isDeviceValid({'createdAt':new Date()}), false);
			assert.equal(device.isDeviceValid({'deviceId': '1234', 
				'createdAt':moment(new Date()).subtract(2, 'months')}), false);
			assert.equal(device.isDeviceValid({'deviceId': '1234', 
				'createdAt':moment(new Date()).subtract(15, 'days')}), false);
			done();
		});*/

		it('should validate', function(done) {
			assert.equal(device.isDeviceValid(null), true);
			assert.equal(device.isDeviceValid({'deviceId': '1234', 
				'createdAt':moment(new Date())}), true);
			assert.equal(device.isDeviceValid({'deviceId': '1234', 
				'createdAt':moment(new Date()).subtract(2, 'days')}), true);
			assert.equal(device.isDeviceValid({'deviceId': '1234', 
				'createdAt':moment(new Date()).subtract(13, 'days')}), true);
			done();
		});
	});

	describe('Device Registration, New User', function() {

		it('should not register registration ID, missing device ID', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/device/register/google",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body": {
					"registrationId" : "123456"
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(code, 400);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					done();
				};
				return obj;
			};
			device.registerGoogle(request, response);
		}); 

		it('should not register registration ID, missing registration ID', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/device/register/google",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body": {
					"deviceId" : "123456"
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(code, 400);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					done();
				};
				return obj;
			};
			device.registerGoogle(request, response);
		}); 

		it('should not register registration ID, missing registration data', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/device/register/google",
				"headers": {
					"authorization": "Basic " + basicAuth
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(code, 400);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					done();
				};
				return obj;
			};
			device.registerGoogle(request, response);
		}); 

		it('should register registration ID, new user', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/device/register/google",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body": {
					"registrationId" : "ABCDEF",
					"deviceId" : "123456"
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(code, 200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					done();
				};
				return obj;
			};
			device.registerGoogle(request, response);
		}); 
	});

	describe("Device Registration, PremoFM Listener", function() {

		beforeEach(function(done) {
			userModel.updateUserPurchases(internalUserId, config.store.premofm_listener_product_id, 
				"order_id", function(error, added) {
					done();
			});
		});

		it('should register registration ID, premofm listener', function(done) {

			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/device/register/google",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body": {
					"registrationId" : "ABCDEFGHIJK",
					"deviceId" : "123456"
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(code, 200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					done();
				};
				return obj;
			};
			device.registerGoogle(request, response);
		}); 
	});
});