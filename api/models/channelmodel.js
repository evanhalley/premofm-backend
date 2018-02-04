var config 		= GLOBAL.config;
var logger 		= GLOBAL.logger;
var mongo 		= require("../mongo");
var ObjectID 	= require("mongodb").ObjectID;
var Long 		= require("mongodb").Long;
var dbHelper 	= require("../helpers/dbhelper");

function ChannelModel() {};

ChannelModel.prototype.TYPE_UNKNOWN 		= -1;
ChannelModel.prototype.TYPE_AUDIO 			= 0;
ChannelModel.prototype.TYPE_VIDEO 			= 1;

var LIMIT = 25;

/**
 * Inserts a new podcast channel into the database TEST ONLY
 */
ChannelModel.prototype.addChannel = function(channelInfo, callback) {
	logger.info("Inserting a new podcast channel");
	var now = new Date();

	var channel = {
		"_id" : new ObjectID(),
		"createdAt": now,
		"updatedAt": now,
		"information": {
			"title": channelInfo.title,
			"author": channelInfo.author,
			"description" : channelInfo.description,
			"siteUrl": channelInfo.siteUrl,
			"feedUrl": channelInfo.feedUrl,
			"artworkUrl": channelInfo.artworkUrl,
			"network": channelInfo.network,
			"keywords": channelInfo.keywords,
			"categories": channelInfo.categories,
			"type": ChannelModel.prototype.TYPE_AUDIO
		},
		"retriever": {
	        "isProcessing": false,
	        "httpLastModified": new Long(-1),
	        "httpETag": "",
	        "dataMd5" : "",
	        "autoUpdateInformation": true,
	        "overrideHttpCaching": false,
	        "updatedAt": null,
	        "lastRetrievedAt": null,
	        "lastParsedAt": null
	    },
	    "metrics": {
	    	"subscribers": 0
	    },
	    "crawler": {
	    	"iTunesId": Math.random() * (10000 - 0) + 0
	    }
	};

	logger.debug("Insert: " + JSON.stringify(channel));
	mongo.collections.channel.insertOne(channel, function(err, result) {

		if (err) {
			logger.error("There was an error in addChannel: " + err.toString());
			callback(err, null);
			return;
		}
		var wasChannelInserted = result.result.n == 1;
		logger.debug("Channel inserted: " + JSON.stringify(result));
		callback(null, channel);
	});
}

/**
 * Subcribes the user with userId to the channels with channelIds
 */
ChannelModel.prototype.subscribeToChannels = function(userId, channelIds, callback) {

	// convert to object IDs
	channelIds = dbHelper.hexStringArrayToObjectIdArray(channelIds);

	// build the queryes
	var query = {
		"_id": ObjectID.createFromHexString(userId)
	};
	var update = {
		"$push" : {
			"channel.subscriptions": {
				"$each" : channelIds
			}
		}
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Update: " + JSON.stringify(update));

	// execute
	mongo.collections.user.updateOne(query, update, function(err, result) {

		if (err) {
			logger.error("There was an error in subscribeToChannels: " + err.toString());
			callback(err, null);
			return;
		}
		var updated = result.result.n == 1;
		logger.debug("Result: " + updated);
		callback(null, updated);
	});
}

/**
 * Subcribes the user with userId to the channel with channelId
 */
ChannelModel.prototype.subscribeToChannel = function(userId, channelId, callback) {
	logger.info(userId + " is subscribing to channel " + channelId);

	var query = {
		"_id": ObjectID.createFromHexString(userId)
		// TODO does not contain the channel ID
	};
	var update = {
		"$push" : {
			"channel.subscriptions": ObjectID.createFromHexString(channelId)
		}
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Update: " + JSON.stringify(update));

	mongo.collections.user.updateOne(query, update, function(err, result) {

		if (err) {
			logger.error("There was an error in subscribeToChannel: " + err.toString());
			callback(err, null);
			return;
		}
		var updated = result.result.n == 1;
		logger.debug("Result: " + updated);
		callback(null, updated);
	});
}

/**
 * Unsubcribes the user with userId from the channel with channelId
 */
ChannelModel.prototype.unsubscribeFromChannel = function(userId, channelId, callback) {
	logger.info(userId + " is unsubscribing from channel " + channelId);

	var query = {
		"_id": ObjectID.createFromHexString(userId)
	};
	var update = {
		"$pull" : {
			"channel.subscriptions": ObjectID.createFromHexString(channelId)
		}
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Update: " + JSON.stringify(update));

	mongo.collections.user.update(query, update, function(err, result) {

		if (err) {
			logger.error("There was an error in subscribeToChannel: " + err.toString());
			callback(err, null);
			return;
		}
		var updated = result.result.n == 1;
		logger.debug("Result: " + updated);
		callback(null, updated);
	});
}

/**
 * Returns an array of subscription objects for the channel IDs passed in
 */
ChannelModel.prototype.getChannelsByObjectIds = function(channelIds, callback) {
	logger.info("getChannelsByObjectIds");

	var query = {
		"_id": { "$in" : channelIds }
	};
	var fields = {
		"_id": 1,
		"information": 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.channel.find(query, fields).toArray(function(error, channels) {

		if (error) {
			logger.error("There was an error in getChannelsByObjectIds: " + error.toString());
			callback(error, null);
			return;
		}
		callback(null, channels);
	});
}

/**
 * Returns an array of subscription objects for the channel IDs passed in
 */
ChannelModel.prototype.getChannels = function(channelIds, callback) {
	logger.info("Getting the subscriptions with the IDs: " + JSON.stringify(channelIds));

	var channelObjectIds = [];

	for (var i = 0; i < channelIds.length; i++) {
		channelObjectIds.push(ObjectID.createFromHexString(channelIds[i]));
	}
	this.getChannelsByObjectIds(channelObjectIds, callback);
}

/**
 * Returns an array of channels, sorted by total number of subscribers
 */
ChannelModel.prototype.getTopChannels = function(callback) {
	logger.info("Getting the top channels by number of subscribers");

	var query = {};
	var fields = {
		"_id": 1,
		"information": 1
	};
	var options = {
		"sort": {
			"metrics.subscribers" : -1
		},
		"limit": LIMIT
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));
	logger.debug("Options:" + JSON.stringify(options));

	mongo.collections.channel.find(query, fields, options).toArray(function(error, channels) {

		if (error) {
			logger.error("There was an error in getChannels: " + error.toString());
			callback(error, null);
			return;
		}
		callback(null, channels);
	});
}

/**
 * Returns an array of trending channels
 */
ChannelModel.prototype.getTrendingChannels = function(callback) {
	logger.info("Getting trending channels");

	var query = {
		"billboard.trendingRank" : {
			"$exists" : true
		}
	};
	var fields = {
		"_id" : 1
	};
	var options = {
		"sort" : {
			"billboard.trendingRank": -1
		}
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));
	logger.debug("Options:" + JSON.stringify(options));

	mongo.collections.channel.find(query, fields, options).toArray(function(error, results) {

		if (error) {
			logger.error("There was an error in getTrendingChannels: " + error.toString());
			callback(error, null);
			return;
		}
		var channelIds = [];

		for (var i = 0; i < results.length; i++) {
			channelIds.push(results[i]._id.toHexString());
		}
		ChannelModel.prototype.getChannels(channelIds, function(error, channels) {

			if (error) {
				logger.error("There was an error in getTrendingChannels: " + error.toString());
				callback(error, null);
				return;
			}
			callback(null, channels);
		});
	});
}

/**
 * Returns an array of subscription objects for the channel IDs passed in
 */
ChannelModel.prototype.getChannel = function(channelId, callback) {
	logger.info("Getting the channels with the ID: " + JSON.stringify(channelId));

	var query = {
		"_id": ObjectID.createFromHexString(channelId)
	};
	var fields = {
		"_id": 1,
		"information": 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.channel.findOne(query, fields, function(error, channel) {

		if (error) {
		 		logger.error("There was an error in getChannel: " + error.toString());
			callback(error, null);
			return;
		}
		callback(null, channel);
	});
}

/**
 * Returns a channel with the specified iTunes ID
 */
ChannelModel.prototype.getChannelByITunesId = function(iTunesId, callback) {
	logger.info("Getting channel with iTunesId: " + iTunesId);

	var query = {
		"crawler.iTunesId" : new Long(iTunesId)
	};
	var fields = {
		"_id": 1,
		"information": 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.channel.findOne(query, fields, function(error, channel) {

		if (error) {
		 	logger.error("There was an error in getChannelByITunesId: " + error.toString());
			return callback(error, null);
		}
		callback(null, channel);
	});
}

/**
 * Returns an array of channels with the given category
 */
ChannelModel.prototype.getChannelsByCategory = function(category, page, callback) {
	logger.info("Getting the channels with the category: " + category);

	var query = {
		"information.categories": {
			"$in": [ category ]
		},
		"information.description" : {
			"$ne" : null
		},
		"information.type" : ChannelModel.prototype.TYPE_AUDIO
	};
	var fields = {
		"_id": 1,
		"information": 1
	};
	var options = {
		"sort": {
			"metrics.subscribers" : -1
		},
		"limit": LIMIT
	};

	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.channel.find(query, fields, options).skip(page * LIMIT).toArray(function(error, channels) {

		if (error) {
			logger.error("There was an error in getChannelsByCategory: " + JSON.stringify(error));
			callback(error, null);
			return;
		}
		callback(null, channels);
	});
}

/**
 * Returns an array of channels with the given category
 */
ChannelModel.prototype.getChannelsByUrls = function(urls, callback) {
	logger.info("Getting the channels by URLs");

	var query = {
		"information.feedUrl": {
			"$in": urls
		},
		"information.description" : {
			"$ne" : null
		},
		"information.type" : ChannelModel.prototype.TYPE_AUDIO
	};
	var fields = {
		"_id": 1,
		"information": 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.channel.find(query, fields).toArray(function(error, channels) {

		if (error) {
			logger.error("There was an error in getChannelsByUrls: " + JSON.stringify(error));
			return callback(error, null);
		}
		callback(null, channels);
	});
}

/**
 * Returns true if the user is subscribed to the channel with the channel ID
 */
ChannelModel.prototype.isSubscribedToChannel = function(userId, channelId, callback) {
	logger.info("Is user " + userId + " subscribed to channel " + channelId);

	// get the user's subscriptions IDs
	var query = {
		"_id": ObjectID.createFromHexString(userId),
		"channel.subscriptions": { "$in": [ ObjectID.createFromHexString(channelId) ]  }
	};
	var fields = {
		"_id": 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.user.findOne(query, fields, function(error, item) {
		var isSubscribed = false;

		if (error) {
			logger.error("There was an error in isSubscribedToChannel: " + error.toString());
			callback(error, null);
			return;
		}
		isSubscribed = item != null;
		logger.debug("User is subscribed: " + isSubscribed);
		callback(null, isSubscribed);
	});
}

ChannelModel.prototype.getChannelMetrics = function(channelId, callback) {
	logger.info("Altering subscriber count for channel: " + channelId);

	var query = {
		"_id": ObjectID.createFromHexString(channelId)
	};
	var fields = {
		"metrics": 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.channel.findOne(query, fields, function(err, channelMetrics) {

		if (err) {
			logger.error("There was an error in getChannelMetrics: " + err.toString());
			callback(err);
			return;
		}
		callback(null, channelMetrics);
	});
}

ChannelModel.prototype.alterSubscriberCount = function(channelId, count, callback) {
	logger.info("Altering subscriber count for channel: " + channelId);

	var query = {
		"_id": ObjectID.createFromHexString(channelId)
	};
	var update = {
		"$inc": { "metrics.subscribers": count }
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Update: " + JSON.stringify(update));

	mongo.collections.channel.update(query, update, function(err, result) {

		if (err) {
			logger.error("There was an error in alterSubscriberCount: " + err.toString());
			callback(err);
			return;
		}
		var updated = result.result.n == 1;
		logger.debug("Result: " + updated);
		callback(null, updated);
	});
}

ChannelModel.prototype.incSubscriberCounts = function(channelIds, callback) {
	channelIds = dbHelper.hexStringArrayToObjectIdArray(channelIds);
	
	var query = {
		"_id": { "$in" : channelIds }
	};
	var update = {
		"$inc": { "metrics.subscribers": 1 }
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Update: " + JSON.stringify(update));

	mongo.collections.channel.update(query, update, function(err, result) {

		if (err) {
			logger.error("There was an error in incSubscriberCounts: " + err.toString());
			callback(err);
			return;
		}
		var updated = result.result.n > 0;
		logger.debug("Result: " + updated);
		callback(null, updated);
	});
}

/**
 * Executes a FTS against the channel collection
 */
ChannelModel.prototype.searchChannels = function(query, limit, page, callback) {
	logger.info("Searching for channel with the query: " + query);

	var query = {
		"$text": {
			"$search": "\"" + query + "\""
		},
		"information.description" : {
			"$ne" : null
		},
		"information.type" : ChannelModel.prototype.TYPE_AUDIO
	};
	var fields = {
		"_id": 1,
		"information": 1,
		"score": {
			"$meta": "textScore"
		}
	};
	var options = {
		"sort": {
			"score": {
				"$meta": "textScore"
			}
		},
		"limit": limit
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));
	logger.debug("Options: " + JSON.stringify(options));

	mongo.collections.channel.find(query, fields, options).skip(page * limit).toArray(function(error, results) {

		if (error) {
			logger.error("There was an error in searchChannel: " + error.toString());
			callback(error, null);
			return;
		}
		callback(null, results);
	});
}

module.exports = new ChannelModel();