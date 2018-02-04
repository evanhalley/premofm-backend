var winston 	= require('winston');
var assert = require('assert');
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
var filter = require("../routes/filter.js");
var apiHelper = require("../helpers/apihelper.js");
var userModel = require("../models/usermodel.js");

var token = "12345";
var basicAuth = null;

describe('Filter', function() {
	var testUser1 = null;

	before(function(done) {
		mongo.init(function(error) {
			mongo.collections.filter.remove({}, function() {
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
	});

	describe('Get filters', function() {

		it('should return 0 filters', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/filter",
				"headers": {
					"authorization": "Basic " + basicAuth
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(code, 200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					assert.equal(result != null, true);
					assert.equal(result.filters != null, true);
					assert.equal(result.filters.length, 0);
					done();
				};
				return obj;
			};
			filter.getFilters(request, response);
		});
	});
});