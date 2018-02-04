var should = require("should");
var winston = require('winston');
var ObjectID 	= require("mongodb").ObjectID;
var assert 		= require('assert');

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
var search = require("../routes/search.js");
var apiHelper = require("../helpers/apihelper.js");
var channelModel = require("../models/channelmodel.js");
var userModel = require("../models/usermodel.js");

describe('Search', function() {
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

	describe('Search channels', function() {
		var channelId = null;
		var episodeId = null;

		before(function(done) {

			var channel = {
				"title": "TitleBlahBlah",
				"author": "Author",
				"description" : "Description",
				"siteUrl": "Site URL",
				"feedUrl": "Feed URL",
				"artworkUrl": "Artwork URL",
				"tags": ["tag 1", "tag 2"]
			};

			var channel2 = {
				"title": "TitleBlahBlah",
				"author": "1Author",
				"description" : null,
				"siteUrl": "1Site URL",
				"feedUrl": "1Feed URL",
				"artworkUrl": "1Artwork URL",
				"tags": ["tag 1", "tag 2"]
			};

			channelModel.addChannel(channel, function(err, insertedChannel) {
				channelId = insertedChannel._id.toHexString();

				channelModel.addChannel(channel2, function(err, insertedChannel) {
					done();
				});
			});
		});

		it('should return the channel in the results', function(done) {
			var request = {
				"ip": "127.0.0.1",
				"originalUrl": "/channel/search",
				"headers": {
					"authorization": "Basic " + basicAuth
				},
				"query" : {
					"q": "titleBlahBlah"
				}
			};
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					assert.equal(result.channels.length, 1);
					done();
				};
				return obj;
			};
			search.query(request, response);
		});
	});
});