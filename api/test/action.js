var assert		= require("assert");
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

var mongo = require("../mongo.js");
var action = require("../routes/action.js");
var apiHelper = require("../helpers/apihelper.js");
var userModel = require("../models/usermodel.js");

var token = "12345";
var basicAuth = null;

describe('Action', function() {
	var testUser1 = null;

	before(function(done) {
		mongo.init(function(error) {
			mongo.collections.action.remove({}, function() {
				mongo.collections.user.remove({}, function() {
					mongo.collections.token.remove({}, function() {
						var user = {
							"email": "testUser1@testman.com",
							"password" : "abc123"
						};
						userModel.createUser(user, function(err, user) {

							userModel.addAuthToken(user._id.toHexString(), token, function(err, success) {
								var userId = apiHelper.toExternalId(user._id.toHexString());
								basicAuth = new Buffer(userId + ":" + token).toString('base64');
								done();
							});
						});
					});
				});
			});
		});
	});

	afterEach(function(done) {
		mongo.collections.action.remove({}, function() {
			done();	
		});
	});

	describe('Post new channel action', function() {

		it('should post channel action', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/action",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body" : [{
				    "channelId" : "8YP2ZJQ8p4CW8pwWkZ9J",
				    "actionType" : 4
				}]
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					assert.equal(true, result.success);
					done();
				};
				return obj;
			};
			action.postAction(request, response);
		});
	});

	describe('Post new episode action', function() {

		it('should post episode action', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/action",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body" : [{
				    "channelId" : "8YP2ZJQ8p4CW8pwWkZ9J",
				    "episodeId" : "8YP2ZJQ8p4CW8pwWkZ9J",
				    "actionType" : 4
				}]
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					assert.equal(true, result.success);
					done();
				};
				return obj;
			};
			action.postAction(request, response);
		});
	});

	describe('Post new collection action', function() {

		it('should post collection action', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/action",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body" : [{
				    "collectionId" : "8YP2ZJQ8p4CW8pwWkZ9J",
				    "actionType" : 5
				}]
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					assert.equal(true, result.success);
					done();
				};
				return obj;
			};
			action.postAction(request, response);
		});
	});
});