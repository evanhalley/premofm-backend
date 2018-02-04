var responseHelper 		= require("../helpers/responsehelper");
var requestHelper 		= require("../helpers/requesthelper");
var apiHelper 			= require("../helpers/apihelper");
var actionModel			= require("../models/actionmodel");
var syncModel 			= require("../models/syncmodel");

var config = GLOBAL.config;
var logger = GLOBAL.logger;

/**
 * The sync route handles synchronization of
 */
function Sync() {

}

/**
 * Saves the synced data to the server
 */
Sync.prototype.syncEpisodes = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	var postedSyncData = request.body;

	if (postedSyncData == null || postedSyncData.length == 0) {
		responseHelper.sendHttpError(response, 400, "Sync data is required");
		return;
	}

	var newSyncData = [];
	
	// loop over each posted sync object, upsert one by one
	for (var i = 0; i < postedSyncData.length; i++) {
		var postedSyncObj = postedSyncData[i];

		if (postedSyncObj.status != syncModel.EPISODE_STATUS_IN_PROGRESS) {
			// TODO validate episode values
			var newSyncObj = {
				"episodeId"		: apiHelper.toInternalId(postedSyncObj.episodeId),
				"status"		: postedSyncObj.status,
				"favorite"		: postedSyncObj.favorite,
				"progress"		: postedSyncObj.progress
			};
			newSyncData.push(newSyncObj);

			// create some action items to insert
			var actions = [];

			if (postedSyncObj.status == syncModel.EPISODE_STATUS_PLAYED) {
				actions.push({
						'channelId'		: postedSyncObj.channelId,
						'episodeId'		: postedSyncObj.episodeId,
						'actionType'  	: actionModel.ACTION_TYPE_EPISODE_LISTEN,
				});
			}

			else if (postedSyncObj.favorite) {
				actions.push({
						'channelId'		: postedSyncObj.channelId,
						'episodeId'		: postedSyncObj.episodeId,
						'actionType'  	: actionModel.ACTION_TYPE_EPISODE_FAVORITE,
				});
			}
		} else {
			logger.error("Device posted episode with sync status of 2 (IN_PROGRESS)");
		}
	}

	if (newSyncData == null || newSyncData.length == 0) {
		responseHelper.sendPostResponse(response, 200, false);
		return;
	}

	// update the database
	syncModel.upsertSyncData(userId, newSyncData, function(error, success) {

		if (error) {
			logger.error("There was an error in /syncEpisode: " + error.toString());
			responseHelper.sendHttpError(response, 500, "Internal Server Error");
			return;
		}

		actionModel.handleNewActions(userId, actions, function(err, result) {

			if (error) {
				logger.error("There was an error in subscribe: " + error.toString());
				responseHelper.sendHttpError(response, 500, "Internal Server Error");
				return;
			}
			responseHelper.sendPostResponse(response, 200, success);
		});
	});
}

module.exports = new Sync();