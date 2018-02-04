var config 		= GLOBAL.config;
var logger 		= GLOBAL.logger;
var mongo 		= require("../mongo");
var ObjectID 	= require("mongodb").ObjectID;

function SyncModel() {};

SyncModel.prototype.EPISODE_STATUS_NEW 			= 1;
SyncModel.prototype.EPISODE_STATUS_IN_PROGRESS 	= 2;
SyncModel.prototype.EPISODE_STATUS_PLAYED 		= 3;
SyncModel.prototype.EPISODE_STATUS_COMPLETED	= 4;
SyncModel.prototype.EPISODE_STATUS_DELETED		= 5;

SyncModel.prototype.getSyncData = function(userId, callback) {
	logger.debug("getSyncData");

	var query = {
		"userId": ObjectID.createFromHexString(userId)
	};
	var fields = {
		"_id"		: 1,
		"episodeId"	: 1,
		"userId"	: 1,
		"progress"	: 1,
		"status"	: 1,
		"favorite"  : 1,
		"updatedAt"	: 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.sync.find(query, fields).toArray(function(err, results) {

		if (err) {
			logger.error("There was an error in getEpisodeSyncData: " + err.toString());
			callback(err, null);
			return;
		}

		if (results == null) {
			results = [];
		}
		callback(null, results);
	});
}

SyncModel.prototype.upsertSyncData = function(userId, syncData, callback) {
	logger.debug("upsertSyncData");

	// start a new bulk operation
	var bulk = mongo.collections.sync.initializeUnorderedBulkOp();

	for (var i = 0; i < syncData.length; i++) {
		var syncObj = syncData[i];
		var userIdObj = ObjectID.createFromHexString(userId);
		var episodeId = ObjectID.createFromHexString(syncObj.episodeId);

		var query = {
			"userId"	: userIdObj,
			"episodeId"	: episodeId
		};
		var update = {
			"$set": {
				"userId"	: userIdObj,
				"episodeId" : episodeId,
				"status"	: syncObj.status,
				"progress"	: syncObj.progress,
				"favorite"  : syncObj.favorite,
				"updatedAt" : new Date()
			}
		};
		logger.debug("Query: " + JSON.stringify(query));
		logger.debug("Update: " + JSON.stringify(update));
		bulk.find(query).upsert().update(update);
	}

	bulk.execute(function(err, result) {

		if (err) {
			logger.error("There was an error in upsertSyncData: " + err.toString());
			callback(err, null);
			return;
		}
		var updated = result.ok == 1;
		logger.debug("Result: " + updated);
		callback(null, updated);
	});
}

module.exports = new SyncModel();