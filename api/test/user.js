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
var user = require("../routes/user.js");
var apiHelper = require("../helpers/apihelper.js");
var userModel = require("../models/usermodel.js");

describe('User', function() {
	var token = '12345';

	before(function(done) {
		mongo.init(function(error) {
			done();
		});
	});

	afterEach(function(done) {
		mongo.collections.user.remove({}, function() {
			mongo.collections.token.remove({}, function() {
				done();
			});
		});
	});

	describe('Create Incomplete User Test', function() {

		it('User creation should fail because of validation', function(done){

			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "test",
				"body" : {
					//"emailAddress": "TestMan@test.com",
					"password": "123456789"
				}
			};

			var response = Object.create(Object.prototype);

			response.status = function(code) {
				code.should.eql(400);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					done();
				};
				return obj;
			};

			user.create(request, response);
		});
	});

	describe('Create User Test', function() {

		it('User creation should succeed', function(done){

			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "test",
				"body" : {
					"email": "TestMan@test.com",
					"password": "123456789"
				}
			};
			var response = Object.create(Object.prototype);

			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					done();
				};
				return obj;
			};

			user.create(request, response);
		});
	});	

	describe('Get User Test', function() {
		
		it('User data should be returned', function(done){

			var newUser = {
				"email": "TestMan@test.com",
				"password": "abc123",
			};

			userModel.createUser(newUser, function(err, newUser) {
				userModel.addAuthToken(newUser._id.toHexString(), token, function(err, success) {
					var userId = apiHelper.toExternalId(newUser._id.toHexString());
					basicAuth = new Buffer(userId + ":" + token).toString('base64');
					
					var request = {
						"ip": "127.0.0.1",
						"originalUrl": "test",
						"headers": {
							"authorization": "Basic " + basicAuth
						}
					};
					var response = Object.create(Object.prototype);

					response.status = function(code) {
						code.should.eql(200);
						var obj = Object.create(Object.prototype);

						obj.send = function(result) {
							result.user.information.email.should.eql("TestMan@test.com");
							done();
						};
						return obj;
					};
					user.get(request, response);
				});
			});
		});
	});

	describe('Update User Email Test', function() {
		var basicAuth;

		before(function(done) {
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

		it('User email should be updated', function(done){

			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "test",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body" : {
					"email": "TestMan@test2.com"
				}
			};
			var response = Object.create(Object.prototype);

			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					result.success.should.be.true;
					done();
				};
				return obj;
			};
			user.updateEmail(request, response);
		});
	});

	describe('Update User Nickname Test', function() {
		var basicAuth;

		before(function(done) {
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

		it('User nickname should be updated', function(done){

			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "test",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body" : {
					"nickname": "newNickname"
				}
			};
			var response = Object.create(Object.prototype);

			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					result.success.should.be.true;
					done();
				};
				return obj;
			};
			user.updateNickname(request, response);
		});
	});

	describe('Update User Email, Missing Information', function() {
		var basicAuth;

		before(function(done) {
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

		it('API should return a success=false', function(done){

			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "test",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body" : {

				}
			};
			var response = Object.create(Object.prototype);

			response.status = function(code) {
				code.should.eql(400);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					done();
				};
				return obj;
			};
			user.updateEmail(request, response);
		});
	});

	describe('Update User Password', function() {
		var basicAuth;

		before(function(done) {
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

		it('User password should be updated', function(done){

			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/updatePassword",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body" : {
					"oldPassword" : "abc123",
					"newPassword" : "123abc"
				}
			};
			var response = Object.create(Object.prototype);

			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					result.success.should.be.true;

					var request = {
						"ip": "127.0.0.1",
						"originalUrl": "/v1/user/authenticate",
						"body": {
							"email": "testUser1@testman.com",
							"password": "123abc"
						}
					};

					var response = Object.create(Object.prototype);

					response.status = function(code) {
						code.should.eql(200);
						var obj = Object.create(Object.prototype);

						obj.send = function(result) {
							result.success.should.be.true;
							done();
						};
						return obj;
					};

					user.authenticate(request, response);
				};
				return obj;
			};
			user.updatePassword(request, response);
		});
	});

	describe('Authenticate User Test', function() {
		var userId = null;

		it('User should be authenticated', function(done){
			var newUser = {
				"email": "TestMan@test.com",
				"password": "abc123"
			};

			userModel.createUser(newUser, function(err, item) {
				var request = {
					"ip": "127.0.0.1",
					"originalUrl": "/v1/user/authenticate",
					"body": {
						"email": "TestMan@test.com",
						"password": "abc123"
					}
				};

				var response = Object.create(Object.prototype);

				response.status = function(code) {
					code.should.eql(200);
					var obj = Object.create(Object.prototype);

					obj.send = function(result) {
						result.success.should.be.true;
						done();
					};
					return obj;
				};

				user.authenticate(request, response);
			});
		});

		it('User should NOT be authenticated', function(done){

			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/v1/user/authenticate",
				"body": {
					"email": "TestMan@test.com",
					"password": "abc123213"
				}
			};

			var response = Object.create(Object.prototype);

			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					result.success.should.be.false;
					done();
				};
				return obj;
			};

			user.authenticate(request, response);		
		});
	});

	describe('Upgrade Premium User', function() {
		var basicAuth;

		before(function(done) {
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

		it('User should not be upgaded to a premium user, failed verification', function(done){

			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/addPurchase",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body" : {
					"signedData" : "abc123",
					"signature" : "123abc",
					"developerPayload": "1234",
					"orderId": "1234",
					"productId": "1234"
				}
			};
			var response = Object.create(Object.prototype);

			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					result.success.should.be.false;
					done();
				};
				return obj;
			};
			user.addPurchase(request, response);
		});

		it('User should not be upgaded to a premium user, missing order id', function(done){

			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/addPurchase",
				"headers": {
					"authorization": "Basic VGVzdE1hbkB0ZXN0LmNvbTphYmMxMjM="
				},
				"body" : {
					"signedData" : "abc123",
					"signature" : "123abc",
					"developerPayload": "1234",
					"productId": "1234"
				}
			};
			var response = Object.create(Object.prototype);

			response.status = function(code) {
				code.should.eql(400);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					done();
				};
				return obj;
			};
			user.addPurchase(request, response);
		});

		it('User should not be upgaded to a premium user, empty developer payload', function(done){

			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/addPurchase",
				"headers": {
					"authorization": "Basic VGVzdE1hbkB0ZXN0LmNvbTphYmMxMjM="
				},
				"body" : {
					"signedData" : "abc123",
					"signature" : "123abc",
					"developerPayload": "",
					"orderId" : "1234",
					"productId": "1234"
				}
			};
			var response = Object.create(Object.prototype);

			response.status = function(code) {
				code.should.eql(400);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					done();
				};
				return obj;
			};
			user.addPurchase(request, response);
		});
	});
});