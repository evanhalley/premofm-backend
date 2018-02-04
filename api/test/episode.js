var should 		= require("should");
var winston 	= require('winston');
var ObjectID 	= require("mongodb").ObjectID;
var assert 		= require('assert');
var moment		= require("moment");

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
var episode = require("../routes/episode.js");
var apiHelper = require("../helpers/apihelper.js");
var episodeModel = require("../models/episodemodel.js");
var userModel = require("../models/usermodel.js");

describe('Episode', function() {
	var testUser1 = null;
	var basicAuth = null;
	var token = '12345';

	before(function(done) {
		mongo.init(function(error) {
			mongo.collections.channel.remove({}, function() {
				mongo.collections.episode.remove({}, function() {
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
	});

	describe('Get episode', function() {
		var channelId = null;
		var episodeId = null;

		before(function(done) {

			channelId = new ObjectID().toHexString();
			var episode = {
				"guid": "guid",
				"title": "title",
				"description": "description",
				"publishedAt": "publishDate",
				"duration": "duration",
				"url": "url",
				"mediaUrl": "mediaUrl",
				"size": "size",
				"mimeType": "mimeType"
			};
			episodeModel.addEpisode(channelId, episode, function(err, insertedEpisode) {
				episodeId = apiHelper.toExternalId(insertedEpisode._id.toHexString());
				done();
			});
		});

		it('should get the episode', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/episode",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"query" : {
					"channelId": channelId,
					"episodeId": episodeId
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					result.episode.guid.should.eql("guid");
					result.episode.title.should.eql("title");
					result.episode.description.should.eql("description");
					result.episode.publishedAt.should.eql("publishDate");
					result.episode.duration.should.eql("duration");
					result.episode.url.should.eql("url");
					result.episode.mediaUrl.should.eql("mediaUrl");
					result.episode.size.should.eql("size");
					result.episode.mimeType.should.eql("mimeType");
					done();
				};
				return obj;
			};
			episode.getEpisode(request, response);
		});
	});

	describe('Get episodes', function() {
		var channelId = null;
		var episodeId = null;

		before(function(done) {

			channelId = new ObjectID().toHexString();
			var episode = {
				"guid": "guid2",
				"title": "title2",
				"description": "description2",
				"publishedAt": new Date(),
				"duration": "duration2",
				"url": "url2",
				"mediaUrl": "mediaUrl2",
				"size": "size2",
				"mimeType": "mimeType2"
			};
			episodeModel.addEpisode(channelId, episode, function(err, insertedEpisode) {
				episodeId = apiHelper.toExternalId(insertedEpisode._id.toHexString());
				done();
			});
		});

		it('should get 0 episodes', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/episodes",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"query" : {
					"channelId": apiHelper.toExternalId(channelId),
					"publishedBefore": 1
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(200, code);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					assert.equal(0, result.episodes.length);
					done();
				};
				return obj;
			};
			episode.getEpisodes(request, response);
		});

		it('should get 1 episode', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/episodes",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"query" : {
					"channelId": apiHelper.toExternalId(channelId),
					"publishedBefore": 1537713853882
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(200, code);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					assert.equal(1, result.episodes.length);
					done();
				};
				return obj;
			};
			episode.getEpisodes(request, response);
		});
	});

describe('Get trending episodes', function() {
		var channelId = null;
		var episodeId = null;

		before(function(done) {

			channelId = new ObjectID().toHexString();
			var episode = {
				"guid": "guid3",
				"title": "title3",
				"description": "description3",
				"publishedAt": new Date(),
				"duration": "duration3",
				"url": "url3",
				"mediaUrl": "mediaUrl3",
				"size": "size3",
				"mimeType": "mimeType3"
			};
			episodeModel.addEpisode(channelId, episode, function(err, insertedEpisode) {
				episodeId = apiHelper.toExternalId(insertedEpisode._id.toHexString());
				done();
			});
		});

		it('should get 0 episodes', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/episodes/trending",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				assert.equal(200, code);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					assert.equal(0, result.episodes.length);
					done();
				};
				return obj;
			};
			episode.getTrendingEpisodes(request, response);
		});
	});
});