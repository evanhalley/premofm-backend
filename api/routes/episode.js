var responseHelper 		= require("../helpers/responsehelper");
var requestHelper 		= require("../helpers/requesthelper");
var validationHelper 	= require("../helpers/validationhelper");
var apiHelper 			= require("../helpers/apihelper");
var dbHelper			= require("../helpers/dbhelper");
var episodeModel 		= require("../models/episodemodel");
var channelModel 		= require("../models/channelmodel");
var userModel 			= require("../models/usermodel");
var syncModel 			= require("../models/syncmodel");
var moment		 		= require("moment");
var async				= require("async");
var bst   				= require("tiny-bst");

var config = GLOBAL.config;
var logger = GLOBAL.logger;

var EPISODES_PER_CHANNEL = 5;

/**
 * Podcast route handles all podcast related API calls like channel subscriptions,
 *   podcast searching, and cross device sycning.
 */
function Episode() {

}

/**
 * Merges a list of episodes with the channel title and artwork url
 */
function mergeWithChannelData(episodes, callback) {
	logger.info("mergeWithChannelData");
	var channelIds = [];

	for (var i = 0; i < episodes.length; i++) {
		channelIds.push(episodes[i].channelId.toHexString());
	}

	channelModel.getChannels(channelIds, function(error, channels) {

		if (error) {
			logger.error("Error in mergeWithChannelData: " + error.toString());
			return callback(null, error);
		}
		var channelMap = [];
		var mergedEpisodes = [];

		for (var i = 0; i < channels.length; i++) {
			channelMap[channels[i]._id.toHexString()] = channels[i];
		}

		for (var i = 0; i < episodes.length; i++) {
			var episode = episodes[i];
			var channel = channelMap[episode.channelId.toHexString()];
			episode["channel"] = {
				"id"		: channel._id,
				"author"	: channel.information.author,
				"title"		: channel.information.title,
				"artworkUrl": channel.information.artworkUrl
			};
			mergedEpisodes.push(episode);
		}
		callback(null, mergedEpisodes);
	});
}

/**
 * Merges episode sync data with a list of episodes
 */
function mergeEpisodesWithSyncData(userId, episodes, callback) {
	var episodeIds = [];

	for (var i = 0; i < episodes.length; i++) {
		episodeIds[i] = episodes[i]._id.toHexString();
	}

	/**
	 * The process of joining our episode timeline with the user's sync data
	 */
	syncModel.getSyncData(userId, function(error, data) {

		if (error) {
			logger.error("There was an error in mergeEpisodesWithSyncData: " + error.toString());
			return callback(error, null);
		}
		var syncMap = [];

		// make this easier and create sync map, key = episode ID
		// used for lookup below
		for (var i = 0; i < data.length; i++) {
			syncMap[data[i].episodeId.toHexString()] = data[i];
		}

		// loop over episode and find a sync object match
		for (var i = 0; i < episodes.length; i++) {
			var syncDataObj = syncMap[episodes[i]._id.toHexString()];

			if (syncDataObj) {
				episodes[i].information.status = syncDataObj.status;
				episodes[i].information.progress = syncDataObj.progress;
				episodes[i].information.favorite = syncDataObj.favorite;
			} else {
				episodes[i].information.status = syncModel.EPISODE_STATUS_NEW;
				episodes[i].information.progress = -1;
				episodes[i].information.favorite = false;
			}
		}
		callback(null, episodes);
	});
}

/**
 * Returns episodes by channel Ids
 *    and merges episode sync data if available
 */
function getEpisodesByChannelIds(channelIds, userId, publishedBefore, updatedAt, limit, callback) {
	var result = [];
	var episodeTree = bst();

	async.series([
		function(seriesCallback) {
			// get episodes for each channel, then add to the sorted tree
			async.each(channelIds, function(channelId, eachCallback) {

				episodeModel.getEpisodesByChannelId(channelId, publishedBefore, updatedAt, limit, function(error, episodes) {

					if (error) {
						return eachCallback(error);
					}

					// add the episodes to a sorted tree
					for (var i = 0; i < episodes.length; i++) {
						episodeTree.insert(moment(episodes[i].information.publishedAt), episodes[i]);
					}
					eachCallback();
				});
			}, function(error) {
				seriesCallback(error);
			});
		},
		function(seriesCallback) {
			var episodes = [];
			// sort in ASC, then reverse for ascending
			var nodes = episodeTree.sort(true).reverse();

			for (var i = 0; i < nodes.length; i++) {
				episodes.push(nodes[i].data);
			}
			// get episodes out of the tree and merge with sync data
			mergeEpisodesWithSyncData(userId, episodes, function(error, episodes) {

				if (error) {
					return seriesCallback(error);
				}
				result = episodes;
				seriesCallback();
			});
		}
	], function(error, res) {

		if (error) {
			logger.error("There was an error in getEpisodesByChannelIds: " + error.toString());
			return callback(error);
		}
		callback(null, result);
	});
}

function getEpisodesCallback(error, episodes, response) {

	if (error) {
		logger.error("There was an error in getEpisodes: " + error.toString());
		return responseHelper.sendHttpError(response, 500, "Internal Server Error");
	}

	for (var i = 0; i < episodes.length; i++) {
		episodes[i] = apiHelper.formatEpisode(episodes[i]);
	}
	var episodeObj = {
		"episodes": episodes
	};
	responseHelper.sendGetResponse(response, 200, episodeObj);
}

/**
 * Retrieves an episode
 */
Episode.prototype.getEpisode = function(request, response) {
	requestHelper.logRequest(request);
	var episodeId = apiHelper.toInternalId(request.query.episodeId);

	if (episodeId == null) {
		return responseHelper.sendHttpError(response, 400, "Episode ID is missing");
	}

	episodeModel.getEpisode(episodeId, function(error, episode) {

		if (error) {
			logger.error("There was an error in getEpisode: " + error.toString());
			return responseHelper.sendHttpError(response, 500, "Internal Server Error");
		}
		responseHelper.sendGetResponse(response, 200, { "episode" : apiHelper.formatEpisode(episode) });
	});
}

Episode.prototype.getTrendingEpisodes = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	
	episodeModel.getTrendingEpisodes(function(error, episodes) {

		if (error) {
			logger.error('There was an error in getTrendingEpisodes: ' + error.toString());
			return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
		}

		mergeWithChannelData(episodes, function(error, mergedEpisodes) {

			if (error) {
				logger.error('There was an error in getTrendingEpisodes: ' + error.toString());
				return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
			}

			mergeEpisodesWithSyncData(userId, episodes, function(error, mergedEpisodes) {

				if (error) {
					logger.error('There was an error in getTrendingEpisodes: ' + error.toString());
					return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
				}
				var returnedEpisodes = [];

				for (var i = 0; i < mergedEpisodes.length; i++) {
					returnedEpisodes.push(apiHelper.formatEpisodeWithChannelData(mergedEpisodes[i]));
				}
				responseHelper.sendGetResponse(response, 200, { 'episodes' : returnedEpisodes });
			});
		});
	});
}

/**
 * Retrieves a list of episodes, descending ordered by publish date
 */
Episode.prototype.getEpisodes = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	var channelId = request.query.channelId;
	var channelIds = request.query.channelIds;

	// set the max number of episodes we can retrieve
	var limit = null;
	var limitParam = request.query.limit;

	if (limitParam) {
		limitParam = parseInt(limitParam);

		if (limitParam > 0 && limitParam <= EPISODES_PER_CHANNEL) {
			limit = limitParam;
		}
	}

	if (limit == null) {
		limit = EPISODES_PER_CHANNEL;
	}

	// set the date we should query on (information.updatedAt)
	var updatedAfter = null;
	var publishedBefore = null;

	if (request.query.t) {
		var temp = parseFloat(request.query.t);

		if (temp > 0) {
			updatedAfter = moment.utc(temp).format();
		}
	} else if (request.query.updatedAfter) {
		var temp = parseFloat(request.query.updatedAfter);

		if (temp > 0) {
			updatedAfter = moment.utc(temp).format();
		}
	} else if (request.query.publishedBefore) {
		var temp = parseFloat(request.query.publishedBefore);

		if (temp > 0) {
			publishedBefore = moment.utc(temp).format();
		}
	}

	if (validationHelper.isValid(channelId)) {
		channelId = apiHelper.toInternalId(channelId);

		getEpisodesByChannelIds([ channelId ], userId, publishedBefore, updatedAfter, limit, function(error, episodes) {
			getEpisodesCallback(error, episodes, response);
		});
	} else if (validationHelper.isValid(channelIds)) { 
		var externalIds = channelIds.split(',');
		var internalIds = [];

		for (var i = 0; i < externalIds.length; i++) {
			internalIds.push(apiHelper.toInternalId(externalIds[i]));
		};
		getEpisodesByChannelIds(internalIds, userId, publishedBefore, updatedAfter, limit, function(error, episodes) {
			getEpisodesCallback(error, episodes, response);
		});
	} else {
		var channelIds = [];

		// get channels the user is subscribed to
		userModel.getSubscriptionIds(userId, function(error, subscribedChannelIds) {

			if (error) {
				logger.error("There was an error in getEpisodes: " + error.toString());
				return responseHelper.sendHttpError(response, 500, "Internal Server Error");
			}
			subscribedChannelIds = dbHelper.convertToHexStringArray(subscribedChannelIds);
			channelIds = channelIds.concat(subscribedChannelIds);

			getEpisodesByChannelIds(channelIds, userId, publishedBefore, updatedAfter, limit, function(error, episodes) {
				getEpisodesCallback(error, episodes, response);
			});
		});
	}
}

module.exports = new Episode();