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
var channelModel = require("../models/channelmodel.js");

describe('ChannelModel', function() {

	before(function(done) {
		mongo.init(function(error) {
			mongo.collections.channel.remove({}, function() {
				done();
			});
		});
	});

	describe('Get channel by feed URLs', function() {

		before(function(done) {
			channelModel.addChannel({
				"title": "Title",
				"author": "Author",
				"description" : "Description",
				"siteUrl": "Site URL",
				"feedUrl": "FeedURL.net",
				"artworkUrl": "Artwork URL",
				"network": "Podcast Network",
				"tags": ["tag 1", "tag 2"]
			}, function(error, result) {
				channelModel.addChannel({
					"title": "Title1",
					"author": "Author1",
					"description" : "Description1",
					"siteUrl": "Site URL1",
					"feedUrl": "FeedURL.com",
					"artworkUrl": "Artwork URL1",
					"network": "Podcast Network1",
					"tags": ["tag 1", "tag 2"]
				}, function(error, result) {
					done();
				});
			});
		});

		it('Should return 0 channels', function(done) {
			var urls = ["FeedURLs.com", "FeedURLs.net"];

			channelModel.getChannelsByUrls(urls, function(error, channels) {
				assert.equal(channels.length, 0);
				done();
			});
		});

		it('Should return 1 channel', function(done) {
			var urls = ["FeedURL.com"];

			channelModel.getChannelsByUrls(urls, function(error, channels) {
				assert.equal(channels.length, 1);
				done();
			});
		});

		it('Should return 2 channels', function(done) {
			var urls = ["FeedURL.com", "FeedURL.net"];

			channelModel.getChannelsByUrls(urls, function(error, channels) {
				assert.equal(channels.length, 2);
				done();
			});
		});
	});
});