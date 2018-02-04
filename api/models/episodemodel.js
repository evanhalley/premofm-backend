var config 		= GLOBAL.config;
var logger 		= GLOBAL.logger;
var mongo 		= require("../mongo");
var ObjectID 	= require("mongodb").ObjectID;
var Long 		= require("mongodb").Long;

function EpisodeModel() {};

/**
 * Inserts a new podcast episode into the database
 */
EpisodeModel.prototype.addEpisode = function(channelId, episodeInfo, callback) {
	logger.debug("addEpisode");

	var episode = {
		"channelId": ObjectID.createFromHexString(channelId),
		"createdAt": new Date(),
		"information" : {
			"guid": episodeInfo.guid,
			"title": episodeInfo.title,
			"description": episodeInfo.description,
			"publishedAt": episodeInfo.publishedAt,
			"duration": episodeInfo.duration,
			"url": episodeInfo.url,
			"mediaUrl": episodeInfo.mediaUrl,
			"size": episodeInfo.size,
			"mimeType": episodeInfo.mimeType
		}
	};
	logger.debug("Update: " + JSON.stringify(episode));

	mongo.collections.episode.insertOne(episode, function(err, result) {

		if (err) {
			logger.error("There was an error in addEpisode: " + err.toString());
			callback(err);
			return;
		}
		var wasEpisodeInserted = result.result.n != null;
		logger.debug("Episode inserted: " + wasEpisodeInserted);
		callback(null, episode);
	});
}

/**
 * Returns a list of episodes from the database for the user, in reverse chronological order
 */
EpisodeModel.prototype.getTimeline = function(userId, callback) {
	logger.debug("getTimeline");

	// get the user's subscriptions IDs
	this.getSubscriptionIds(userId, function(error, subscriptionIds) {

		var query = {
			"_id": {
				"$in" : subscriptionIds
			}
		};
		var fields = {
			"_id": 1,
			"information": 0,
			"episodes": 1
		};
		logger.debug("Query: " + JSON.stringify(query));
		logger.debug("Fields: " + JSON.stringify(fields));

		mongo.collections.user.find(query, fields).toArray(function(err, items) {

			if (err) {
				logger.error("There was an error in getTimeline: " + err.toString());
				callback(err, null);
				return;
			}
			callback(null, items);
		});
	});
}

/**
 * Returns the episode with the specified ID belonging to the channel with the ID
 */
EpisodeModel.prototype.getEpisode = function(episodeId, callback) {
	logger.debug("getEpisode");

	var query = {
		"_id": ObjectID.createFromHexString(episodeId)
	};
	logger.debug("Query: " + JSON.stringify(query));

	mongo.collections.episode.findOne(query, function(error, episode) {

		if (error) {
			logger.error("There was an error in getEpisode: " + error.toString());
			callback(error, null);
			return;
		}
		callback(null, episode);
	});
}

/**
 * Returns an array of episodes
 */
EpisodeModel.prototype.getEpisodesByObjectIds = function(episodeIds, callback) {
	logger.info("getEpisodesByObjectIds");

	var query = {
		"_id": { "$in" : episodeIds }
	};
	var fields = {
		"_id": 1,
		"information": 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.episode.find(query, fields).toArray(function(error, episodes) {

		if (error) {
			logger.error("There was an error in getEpisodesByObjectIds: " + error.toString());
			callback(error, null);
			return;
		}
		callback(null, episodes);
	});
}

/**
 * Returns the episodes with the specified channel IDs belonging to the channel with the ID
 */
EpisodeModel.prototype.getEpisodesByChannelId = function(channelId, publishedBefore, updatedAt, limit, callback) {
	logger.debug("getEpisodesByChannelId");

	var query = {
		"channelId": ObjectID.createFromHexString(channelId)
	};

	// retrieve episodes newer than the updated date
	if (updatedAt) {
		query['information.updatedAt'] = {
			"$gte": new Date(updatedAt)
		};
	}

	// retrieve episodes older than this publishedAt date
	else if (publishedBefore) {
		query['information.publishedAt'] = {
			"$lt": new Date(publishedBefore)
		};
	}
	query = {
		"$query": query,
		"$orderby": {
			"information.publishedAt": -1
		}
	};

	logger.debug("Query: " + JSON.stringify(query));

	mongo.collections.episode.find(query).limit(limit).toArray(function(error, episodes) {

		if (error) {
			logger.error("There was an error in getEpisodesByChannelId: " + error.toString());
			callback(error, null);
			return;
		}
		callback(null, episodes);
	});
}

/**
 * Executes a FTS against the episode collection
 */
EpisodeModel.prototype.searchEpisodes = function(query, limit, callback) {
	logger.debug("searchEpisodes");

	var query = {
		"$text": { "$search": query }
	};
	var fields = {
		"_id": 1,
		"information": 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));
	logger.debug("Limit: " + limit);

	mongo.collections.episode.find(query).limit(limit).toArray(function(error, results) {

		if (error) {
			logger.error("There was an error in searchEpisodes:" + error.toString());
			callback(error, null);
			return;
		}
		callback(null, results);
	});
}

/**
 * Returns an array of trending channels
 */
EpisodeModel.prototype.getTrendingEpisodes = function(callback) {
	logger.info("getTrendingEpisodes");

	var query = {
		"billboard.trendingRank" : {
			"$exists" : true
		}
	};
	var fields = {
		"_id" : 1,
		"channelId": 1,
		"information" : 1
	};
	var options = {
		"sort" : {
			"billboard.trendingRank": -1
		}
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));
	logger.debug("Options:" + JSON.stringify(options));

	mongo.collections.episode.find(query, fields, options).toArray(function(error, results) {

		if (error) {
			logger.error("There was an error in getTrendingEpisodes: " + error.toString());
			return callback(error, null);
		}
		callback(null, results);
	});
}

module.exports = new EpisodeModel();