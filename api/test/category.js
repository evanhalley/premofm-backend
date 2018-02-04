var should		= require("should");
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
var category = require("../routes/category.js");
var apiHelper = require("../helpers/apihelper.js");
var userModel = require("../models/usermodel.js");

var basicAuth = null;
var token = '12345';

describe('Category', function() {
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

	describe('Get Categories', function() {

		it('should get categories', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/category",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body" : {}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					result.categories.length.should.be.above(0);
					done();
				};
				return obj;
			};
			category.getCategories(request, response);
		});
	});
});