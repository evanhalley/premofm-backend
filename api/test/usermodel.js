var winston 	= require('winston');
var assert 		= require('assert');
var ObjectID 	= require("mongodb").ObjectID;
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
var userModel = require("../models/usermodel.js");

describe('UserModel', function() {

	before(function(done) {
		mongo.init(function(error) {
			mongo.collections.user.remove({}, function() {
				done();
			});
		});
	});

	describe('User count', function() {

		it('Should return 0 users', function(done) {
			userModel.getNumberOfUsers(function(error, count) {
				assert.equal(count, 0);
				done();
			});
		});

		it('Should return 1 user', function(done) {
			var user = {
				"email": "testUser1@testman.com",
				"password" : "abc123"
			};
			userModel.createUser(user, function(err, user) {
				
				userModel.getNumberOfUsers(function(error, count) {
					assert.equal(count, 1);
					mongo.collections.user.remove({}, function() {
						done();
					});
				});
			});
		});
	});

	describe('Curator', function() {
		var userId;

		before(function(done) {
			var user = {
				"email": "testUser1@testman.com",
				"password" : "abc123"
			};
			userModel.createUser(user, function(err, user) {
				userId = user._id.toHexString();
				done();
			});
		});

		it('Should turn the user into a collection curator', function(done) {
			userModel.updateCollectionCurator(userId, true, function(error, success) {

				userModel.isCollectionCurator(userId, function(error, isCurator) {
					assert.equal(isCurator, true);
					done();
				});
			});
		});

		it('Should disable user collection curator', function(done) {
			userModel.updateCollectionCurator(userId, false, function(error, success) {

				userModel.isCollectionCurator(userId, function(error, isCurator) {
					assert.equal(isCurator, false);
					done();
				});
			});
		});

		after(function(done) {
			mongo.collections.user.remove({}, function() {
				done();
			});
		});

	});
	
});