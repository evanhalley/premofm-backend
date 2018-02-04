var should = require("should");
var winston = require('winston');

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
var sync = require("../routes/sync.js");
var syncModel = require("../models/syncmodel.js");
var apiHelper = require("../helpers/apihelper.js");
var userModel = require("../models/usermodel.js");

describe('Sync', function() {
	var testUser1 = null;
	var basicAuth = null;
	var token = '12345';

	before(function(done) {
		mongo.init(function(error) {
			mongo.collections.channel.remove({}, function() {
				mongo.collections.user.remove({}, function() {
					mongo.collections.token.remove({}, function() {
						var user = {
							"email": "testUser1@testman.com",
							"password" : "abc123"
						};
						userModel.createUser(user, function(err, user) {

							userModel.addAuthToken(user._id.toHexString(), token, function(err, success) {
								testUser1 = user._id.toHexString();
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

	describe('Post Sync Data (missing body)', function() {

		it('should return 400', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/sync/episodes",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body" : {}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				code.should.eql(400);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					done();
				}
				return obj;
			};
			sync.syncEpisodes(request, response);
		});
	});
});