var responseHelper 		= require('../helpers/responsehelper');
var validationHelper 	= require('../helpers/validationhelper')
var requestHelper 		= require('../helpers/requesthelper');
var apiHelper 			= require('../helpers/apihelper');
var dbHelper 			= require('../helpers/dbhelper');
var actionModel 		= require('../models/actionmodel');
var channelModel 		= require('../models/channelmodel');
var userModel 			= require('../models/usermodel');
var underscore			= require('underscore');

var config = GLOBAL.config;
var logger = GLOBAL.logger;

/**
 * Channel route handles all channel related API calls like channel subscriptions,
 *   channel searching, and cross device syncing.
 */
function Channel() {

}

/**
 * Convenience function for incrementing/decrementing the subscribers count
 */
function alterSubscribers(channelId, count, callback) {

	if (count != 1 && count != -1) {
		callback('Count can only be 1 or -1');
		return;
	}
	
	// get the channel metrics first
	channelModel.getChannelMetrics(channelId, function(error, channelMetrics) {
		logger.debug(JSON.stringify(channelMetrics));

		if (error) {
			return callback(error);
		}

		// we are decrementing the count, but subscribers is 0, stop right here
		if (channelMetrics.subscribers == 0 && count == -1) {
			return callback(null);
		}

		channelModel.alterSubscriberCount(channelId, count, function(error, success) {
			callback(error);
		});
	});
}

/**
 * Returns a list of channels the user is subscribed to.
 */
Channel.prototype.subscriptions = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);

	userModel.getSubscriptionIds(userId, function(error, ids) {

		if (error) {
			logger.error('There was an error in subscriptions: ' + error.toString());
			return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
		}
		ids = dbHelper.convertToHexStringArray(ids);

		channelModel.getChannels(ids, function(error, subscriptions) {

			if (error) {
				logger.error('There was an error in subscriptions: ' + error.toString());
				return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
			}
			subscriptions = apiHelper.formatChannels(subscriptions);
			responseHelper.sendGetResponse(response, 200, { 'subscriptions': subscriptions });
		});
	});
}

Channel.prototype.bulkSubscribe = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	var feedUrls = request.body.feedUrls;

	if (validationHelper.isArrayEmpty(feedUrls)) {
		return responseHelper.sendHttpError(response, 400, 'Missing feed URLs');
	}

	channelModel.getChannelsByUrls(feedUrls, function(error, channels) {

		if (error) {
			logger.error('There was an error in bulkSubscribe: ' + error.toString());
			return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
		}

		if (validationHelper.isArrayEmpty(feedUrls)) {
			return responseHelper.sendHttpError(response, 400, 'No channels subscribed');
		}

		userModel.getSubscriptionIds(userId, function(error, subscriptions) {

			if (error) {
				logger.error('There was an error in bulkSubscribe: ' + error.toString());
				return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
			}
			var subscribedChannelIds = [];

			if (!validationHelper.isArrayEmpty(subscriptions)) {
				subscribedChannelIds = dbHelper.convertToHexStringArray(subscriptions);
			}
			var bulkChannelIds = dbHelper.objectArrayToHexStringArray(channels);
			var idsToSubscribe = underscore.difference(bulkChannelIds, subscribedChannelIds);
		
			channelModel.subscribeToChannels(userId, idsToSubscribe, function(error, result) {

				if (error) {
					logger.error('There was an error in bulkSubscribe: ' + error.toString());
					return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
				}

				if (result) {

					channelModel.incSubscriberCounts(idsToSubscribe, function(error) {
						
						channelModel.getChannels(idsToSubscribe, function(error, returnedChannels) {

							if (error) {
								logger.error('There was an error in bulkSubscribe: ' + error.toString());
								return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
							}
							returnedChannels = apiHelper.formatChannels(returnedChannels);
							responseHelper.sendBulkSubscribeResponse(response, 200, true, returnedChannels);
						});
					});
				} else {
					responseHelper.sendBulkSubscribeResponse(response, 200, false, []);
				}
			});
		});
	});
}

/**
 * Subscribes the user to the designated channel
 */
Channel.prototype.subscribe = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	var channelId = apiHelper.toInternalId(request.body.channelId);

	channelModel.isSubscribedToChannel(userId, channelId, function(error, isSubscribed){

		if (error) {
			logger.error('There was an error in subscribe: ' + error.toString());
			return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
		}
		
		if (isSubscribed) {
			return responseHelper.sendPostResponse(response, 200, 'User was already subscribed to this channel');
		}
		channelModel.subscribeToChannel(userId, channelId, function(error) {

			if (error) {
				logger.error('There was an error in subscribe: ' + error.toString());
				return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
			}

			// write a performance record for the subscribe
			var actions = [{
				'channelId'		: request.body.channelId,
				'actionType'  	: actionModel.ACTION_TYPE_CHANNEL_SUBSCRIBE,
			}];

			actionModel.handleNewActions(userId, actions, function(err, result) {

				if (error) {
					logger.error('There was an error in subscribe: ' + error.toString());
					return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
				}

				// increment the subscriber count
				alterSubscribers(channelId, 1, function(error) {
					responseHelper.sendPostResponse(response, 200, error == null);
				});
			});
		});
	});
}

/**
 * Unsubscribes the user from the designated channel
 */
Channel.prototype.unsubscribe = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	var channelId = apiHelper.toInternalId(request.body.channelId);

	channelModel.isSubscribedToChannel(userId, channelId, function(error, isSubscribed){

		if (error) {
			logger.error('There was an error in unsubscribe: ' + error.toString());
			return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
		}
		
		if (!isSubscribed ) {
			return responseHelper.sendPostResponse(response, 200, 'User has not subscribed to this channel');
		}
		channelModel.unsubscribeFromChannel(userId, channelId, function(error) {

			if (error) {
				logger.error('There was an error in unsubscribe: ' + error.toString());
				return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
			}

			alterSubscribers(channelId, -1, function(error) {
				// TODO make this better
				responseHelper.sendPostResponse(response, 200, error == null);
			});
		});
	});
}

/**
 * Retrieves a channel
 */
Channel.prototype.getChannel = function(request, response) {
	requestHelper.logRequest(request);
	var iTunesId = request.query.iTunesId
	var channelId = request.query.channelId;
	var category = request.query.category;

	if (channelId || category || iTunesId) {

		// get a channel by ID
		if (channelId) {
			channelId = apiHelper.toInternalId(request.query.channelId);
			
			channelModel.getChannel(channelId, function(error, channel) {

				if (error) {
					logger.error('There was an error in getChannel: ' + error.toString());
					return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
				}
				channel = apiHelper.formatChannel(channel);
				responseHelper.sendGetResponse(response, 200, { 'channel' : channel });
			});
		} 

		else if (iTunesId) {

			channelModel.getChannelByITunesId(iTunesId, function(error, channel) {

				if (error) {
					logger.error('There was an error in getChannel: ' + error.toString());
					return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
				}
				channel = apiHelper.formatChannel(channel);
				responseHelper.sendGetResponse(response, 200, { 'channel' : channel });
			});
		}

		// get channels by category
		else {
			var page = request.query.page;
			
			if (page == null || page == undefined) {
				page = 0;
			}
			channelModel.getChannelsByCategory(category, page, function(error, channels) {

				if (error) {
					logger.error('There was an error in getChannel: ' + error.toString());
					return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
				}
				channels = apiHelper.formatChannels(channels);
				responseHelper.sendGetResponse(response, 200, { 'channels' : channels });
			});
		}
	} else {
		responseHelper.sendHttpError(response, 400, 'Missing channelId, iTunesId, or category');
	}
}

Channel.prototype.topChannels = function(request, response) {
	requestHelper.logRequest(request);

	channelModel.getTopChannels(function(error, channels) {

		if (error) {
			logger.error('There was an error in topChannels: ' + error.toString());
			return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
		}
		channels = apiHelper.formatChannels(channels);
		responseHelper.sendGetResponse(response, 200, { 'channels' : channels });
	});
}

Channel.prototype.trendingChannels = function(request, response) {
	requestHelper.logRequest(request);
	
	channelModel.getTrendingChannels(function(err, channels) {

		if (err) {
			logger.error('There was an error in trendingChannels: ' + err.toString());
			return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
		}
		channels = apiHelper.formatChannels(channels);
		responseHelper.sendGetResponse(response, 200, { 'channels' : channels });
	});
}

module.exports = new Channel();