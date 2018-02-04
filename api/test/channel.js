var should		= require("should");
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

var mongo = require("../mongo.js");
var channel = require("../routes/channel.js");
var apiHelper = require("../helpers/apihelper.js");
var channelModel = require("../models/channelmodel.js");
var userModel = require("../models/usermodel.js");

describe('Channel', function() {
	var testUser1 = null;
	var basicAuth = null;
	var token = '12345';

	before(function(done) {
		mongo.init(function(error) {
			done();
		});
	});

	beforeEach(function(done) {
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

	describe('Get Subscriptions (Empty List)', function() {

		it('should be empty list of subscriptions', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/subscriptions",
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
					result.subscriptions.length.should.eql(0);
					done();
				};
				return obj;
			};

			channel.subscriptions(request, response);
		});
	});

	describe('Get Subscriptions', function() {

		it('should be list of 1 subscriptions', function(done) {

			var newChannel = {
				"title": "Title",
				"author": "Author",
				"description" : "Description",
				"siteUrl": "Site URL",
				"feedUrl": "Feed URL",
				"artworkUrl": "Artwork URL",
				"network": "Podcast Network",
				"tags": ["tag 1", "tag 2"]
			};

			channelModel.addChannel(newChannel, function(err, insertedChannel) {
				logger.debug(JSON.stringify(insertedChannel));

				channelModel.subscribeToChannel(testUser1, insertedChannel._id.toHexString(), function(err, subscribed) {
					var request = {
						"ip": "127.0.0.1",
						"originalUrl": "/subscriptions",
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
							result.subscriptions.length.should.eql(1);
							done();
						};
						return obj;
					};
					channel.subscriptions(request, response);
				});
			});
		});
	});

	describe('Subscribe to channel', function() {
		var channelId = null;

		it('should subscribe to the podcast channel', function(done) {
			var newChannel = {
				"title": "Title",
				"author": "Author",
				"description" : "Description",
				"siteUrl": "Site URL",
				"feedUrl": "Feed URL",
				"artworkUrl": "Artwork URL",
				"network": "Podcast Network",
				"tags": ["tag 1", "tag 2"]
			};

			channelModel.addChannel(newChannel, function(err, insertedChannel) {
				var request = {
					"ip": "127.0.0.1",
					"originalUrl": "/subscribe",
					"headers": {
						"authorization": "Basic " + basicAuth
					},
					"body" : {
						"channelId": apiHelper.toExternalId(insertedChannel._id.toHexString())
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
				channel.subscribe(request, response);
			});
		});
	});

	describe('Unsubscribe from channel', function() {
		var id = new ObjectID();

		it('should unsubscribe from the podcast channel', function(done) {

			var newChannel = {
				"title": "Title",
				"author": "Author",
				"description" : "Description",
				"siteUrl": "Site URL",
				"feedUrl": "Feed URL",
				"artworkUrl": "Artwork URL",
				"network": "Podcast Network",
				"tags": ["tag 1", "tag 2"]
			};

			channelModel.addChannel(newChannel, function(err, insertedChannel) {
				var channelId = apiHelper.toExternalId(insertedChannel._id.toHexString());
				channelModel.subscribeToChannel(testUser1, insertedChannel._id.toHexString(), function(err, subscribed) {
					var request = {
						"ip": "127.0.0.1",
						"originalUrl": "/unsubscribe",
						"headers": {
							"authorization": "Basic " + basicAuth
						},
						"body" : {
							"channelId": channelId
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
					channel.unsubscribe(request, response);
				});
			});
		});
	});

	describe('Get channel', function() {
		
		it('should get the podcast channel', function(done) {
			var newChannel = {
				"title": "Title",
				"author": "Author",
				"description" : "Description",
				"siteUrl": "Site URL",
				"feedUrl": "Feed URL",
				"artworkUrl": "Artwork URL",
				"network": "Podcast Network",
				"tags": ["tag 1", "tag 2"]
			};

			channelModel.addChannel(newChannel, function(err, insertedChannel) {
				var channelId = apiHelper.toExternalId(insertedChannel._id.toHexString());
				var request = {
					"ip": "127.0.0.1",
					"originalUrl": "/channel",
					"headers": {
						"authorization": "Basic " + basicAuth
					},
					"query" : {
						"channelId": channelId
					}
				};
				var response = Object.create(Object.prototype);
				response.status = function(code) {
					code.should.eql(200);
					var obj = Object.create(Object.prototype);

					obj.send = function(result) {
						result.channel.title.should.equal("Title");
						result.channel.author.should.equal("Author");
						result.channel.description.should.equal("Description");
						result.channel.siteUrl.should.equal("Site URL");
						result.channel.feedUrl.should.equal("Feed URL");
						result.channel.artworkUrl.should.equal("Artwork URL");
						result.channel.network.should.equal("Podcast Network");
						done();
					};
					return obj;
				};
				channel.getChannel(request, response);
			});
		});
	});

	describe('Get channels by category', function() {
		
		it('should get the podcast channel with the category tech', function(done) {
			var newChannel = {
				"title": "Title",
				"author": "Author",
				"description" : "Description",
				"siteUrl": "Site URL",
				"feedUrl": "Feed URL",
				"artworkUrl": "Artwork URL",
				"network": "Podcast Network",
				"categories" : ["tech"]
			};

			channelModel.addChannel(newChannel, function(err, insertedChannel) {

				var request = {
					"ip": "127.0.0.1",
					"originalUrl": "/channel",
					"headers": {
						"authorization": "Basic " + basicAuth
					},
					"query" : {
						"category": "tech"
					}
				};
				var response = Object.create(Object.prototype);
				response.status = function(code) {
					code.should.eql(200);
					var obj = Object.create(Object.prototype);

					obj.send = function(result) {

						result.channels[0].title.should.equal("Title");
						result.channels[0].author.should.equal("Author");
						result.channels[0].description.should.equal("Description");
						result.channels[0].siteUrl.should.equal("Site URL");
						result.channels[0].feedUrl.should.equal("Feed URL");
						result.channels[0].artworkUrl.should.equal("Artwork URL");
						result.channels[0].network.should.equal("Podcast Network");
						done();
					};
					return obj;
				};
				channel.getChannel(request, response);
			});
		});
	});

	describe('Bulk subscribe to channel', function() {

		it('should bulk subscribe to the podcast channel', function(done) {
			var newChannel = {
				"title": "Title1",
				"author": "Author1",
				"description" : "Description1",
				"siteUrl": "Site URL1",
				"feedUrl": "Feed URL1",
				"artworkUrl": "Artwork URL1",
				"network": "Podcast Network1",
				"tags": ["tag 1", "tag 2"]
			};

			channelModel.addChannel(newChannel, function(err, insertedChannel) {
				var newChannel2 = {
					"title": "Title2",
					"author": "Author2",
					"description" : "Description2",
					"siteUrl": "Site URL2",
					"feedUrl": "Feed URL2",
					"artworkUrl": "Artwork URL2",
					"network": "Podcast Network2",
					"tags": ["tag 1", "tag 22"]
				};

				channelModel.addChannel(newChannel2, function(err, insertedChannel) {
					var request = {
						"ip": "127.0.0.1",
						"originalUrl": "/bulkSubscribe",
						"headers": {
							"authorization": "Basic " + basicAuth
						},
						"body" : {
							"feedUrls": [ "Feed URL1", "Feed URL2" ]
						}
					};
					var response = Object.create(Object.prototype);
					response.status = function(code) {
						code.should.eql(200);
						var obj = Object.create(Object.prototype);

						obj.send = function(result) {
							assert.equal(true, result.success);
							assert.equal(2, result.channels.length);
							assert.equal("Feed URL1", result.channels[0].feedUrl);
							assert.equal("Feed URL2", result.channels[1].feedUrl);
							done();
						};
						return obj;
					};
					channel.bulkSubscribe(request, response);
				});
			});
		});

		it('should bulk subscribe to one of the podcast channels', function(done) {
			var newChannel = {
				"title": "Title1",
				"author": "Author1",
				"description" : "Description1",
				"siteUrl": "Site URL1",
				"feedUrl": "Feed URL1",
				"artworkUrl": "Artwork URL1",
				"network": "Podcast Network1",
				"tags": ["tag 1", "tag 2"]
			};

			channelModel.addChannel(newChannel, function(err, insertedChannel) {

				channelModel.subscribeToChannel(testUser1, insertedChannel._id.toHexString(), function() {

					var newChannel2 = {
						"title": "Title2",
						"author": "Author2",
						"description" : "Description2",
						"siteUrl": "Site URL2",
						"feedUrl": "Feed URL2",
						"artworkUrl": "Artwork URL2",
						"network": "Podcast Network2",
						"tags": ["tag 1", "tag 22"]
					};

					channelModel.addChannel(newChannel2, function(err, insertedChannel) {
						var request = {
							"ip": "127.0.0.1",
							"originalUrl": "/bulkSubscribe",
							"headers": {
								"authorization": "Basic " + basicAuth
							},
							"body" : {
								"feedUrls": [ "Feed URL1", "Feed URL2" ]
							}
						};
						var response = Object.create(Object.prototype);
						response.status = function(code) {
							code.should.eql(200);
							var obj = Object.create(Object.prototype);

							obj.send = function(result) {
								assert.equal(true, result.success);
								assert.equal(1, result.channels.length);
								assert.equal("Feed URL2", result.channels[0].feedUrl);
								done();
							};
							return obj;
						};
						channel.bulkSubscribe(request, response);
					});
				});
			});
		});
	});
});