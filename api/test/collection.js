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
var redis = require("../redis");
var collection = require("../routes/collection.js");
var collectionModel = require("../models/collectionmodel.js");
var apiHelper = require("../helpers/apihelper.js");
var userModel = require("../models/usermodel.js");

var token = "12345";
var basicAuth = null;

describe('Collection', function() {
	var testUser1 = null;
	var internalUserId = null;

	before(function(done) {
		redis.init(function(error) {
			mongo.init(function(error) {
				mongo.collections.collection.remove({}, function() {
					mongo.collections.action.remove({}, function() {
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
			});
		});
	});

	describe('Get collections', function() {

		it('should return 0 collections', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/collection",
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
					assert.equal(result.collections != null, true);
					assert.equal(result.collections.length, 0);
					done();
				};
				return obj;
			};
			collection.getCollections(request, response);
		});
	});

	describe('Create collection', function() {

		it('should not create any collection, invalid type', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/collection/create",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body": {
					"name" : "Loris Ipsum",
					"description" : "Loris Ipsum",
					"isPublic" : false,
					"type" : 99,
					"channelIds" : []
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
			collection.createCollection(request, response);
		}); 

		it('should not create any collection, missing episode IDs', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/collection/create",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body": {
					"name" : "Loris Ipsum",
					"description" : "Loris Ipsum",
					"isPublic" : false,
					"type" : 1,
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
			collection.createCollection(request, response);
		}); 

		it('should create 1 collection', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/collection/create",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body": {
					"name" : "Loris Ipsum",
					"description" : "Loris Ipsum",
					"isPublic" : false,
					"type" : 0,
					"channelIds" : []
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(code, 200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					assert.equal(result != null, true);
					assert.equal(result.success, true);
					assert.equal(result.id.length > 0, true);
					done();
				};
				return obj;
			};
			collection.createCollection(request, response);
		}); 

		it('should not create public collection, not curator', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/collection/create",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body": {
					"name" : "Loris Ipsum",
					"description" : "Loris Ipsum",
					"isPublic" : true,
					"type" : 0,
					"channelIds" : []
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(code, 200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					assert.equal(result != null, true);
					assert.equal(result.success, false);
					done();
				};
				return obj;
			};
			collection.createCollection(request, response);
		}); 
	});

	describe('Update collection', function() {
		var collectionId;

		before(function(done) {
			var newCollection =	{
					"name" : "Loris Ipsum",
					"description" : "Loris Ipsum",
					"isPublic" : false,
					"type" : 0,
					"channelIds" : []
				}
			collectionModel.insertCollection(internalUserId, newCollection, function(error, result) {
				collectionId = apiHelper.toExternalId(result._id);
				done();
			});
		});

		it('should not update a collection, missing name', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/collection/update",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body": {
					"id" : collectionId,
					"description" : "Loris Ipsum",
					"isPublic" : false,
					"type" : 0,
					"channelIds" : []
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
			collection.updateCollection(request, response);
		});

		it('should update a collection', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/collection/update",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body": {
					"id" : collectionId,
					"name" : "Loris Ipsum",
					"description" : "Loris Ipsum",
					"isPublic" : false,
					"type" : 0,
					"channelIds" : []
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(code, 200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					assert.equal(result.success, true);
					done();
				};
				return obj;
			};
			collection.updateCollection(request, response);
		});
	}); 

	describe('Update public collection', function() {
		var collectionId;

		before(function(done) {
			var newCollection =	{
					"name" : "Loris Ipsum",
					"description" : "Loris Ipsum",
					"isPublic" : true,
					"type" : 0,
					"channelIds" : []
				}
			collectionModel.insertCollection(internalUserId, newCollection, function(error, result) {
				collectionId = apiHelper.toExternalId(result._id);
				userModel.updateUserPurchases(internalUserId, config.store.premofm_listener_product_id, "1234", function(error, result) {
					done();
				});
			});
		});

		it('should not update a public collection, not a curator', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/collection/update",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body": {
					"id" : collectionId,
					"name" : "Loris Ipsum",
					"description" : "Loris Ipsum",
					"isPublic" : true,
					"type" : 0,
					"channelIds" : []
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(code, 200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					assert.equal(result.success, false);
					done();
				};
				return obj;
			};
			collection.updateCollection(request, response);
		});

		it('should update a public collection', function(done) {
			userModel.updateCollectionCurator(internalUserId, true, function(error, result) {
				var request = {
					"ip": "127.0.0.1",
					"originalUrl": "/collection/update",
					"headers": {
						"authorization": "Basic " + basicAuth
					},
					"body": {
						"id" : collectionId,
						"name" : "Loris Ipsum",
						"description" : "Loris Ipsum",
						"isPublic" : true,
						"type" : 0,
						"channelIds" : []
					}
				};
				var response = Object.create(Object.prototype);
				response.status = function(code) {
					assert.equal(code, 200);
					var obj = Object.create(Object.prototype);

					obj.send = function(result) {
						assert.equal(result.success, true);
						done();
					};
					return obj;
				};
				collection.updateCollection(request, response);
			});
		});	
	}); 

	describe('Delete collection', function() {
		var collectionId;

		before(function(done) {
			var newCollection =	{
					"name" : "Loris Ipsum",
					"description" : "Loris Ipsum",
					"isPublic" : false,
					"type" : 0,
					"channelIds" : []
				}
			collectionModel.insertCollection(internalUserId, newCollection, function(error, result) {
				collectionId = apiHelper.toExternalId(result._id);
				done();
			});
		});

		it('should not delete a collection, missing id', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/collection/delete",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body": {
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
			collection.deleteCollection(request, response);
		});

		it('should delete a collection', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/collection/delete",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"body": {
					"id" : collectionId
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(code, 200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					assert.equal(result.success, true);
					done();
				};
				return obj;
			};
			collection.deleteCollection(request, response);
		});
	});
});