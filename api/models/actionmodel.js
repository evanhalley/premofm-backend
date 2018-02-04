var config 		= GLOBAL.config;
var logger 		= GLOBAL.logger;
var mongo 		= require("../mongo");
var ObjectID 	= require("mongodb").ObjectID;
var apiHelper 	= require("../helpers/apihelper");

function ActionModel() {};

ActionModel.prototype.ACTION_TYPE_EPISODE_LISTEN 	= 0;
ActionModel.prototype.ACTION_TYPE_EPISODE_DOWNLOAD 	= 1;
ActionModel.prototype.ACTION_TYPE_EPISODE_FAVORITE 	= 2;
ActionModel.prototype.ACTION_TYPE_CHANNEL_SUBSCRIBE = 3;
ActionModel.prototype.ACTION_TYPE_CHANNEL_FAVORITE 	= 4;
ActionModel.prototype.ACTION_TYPE_COLLECTION_ADD 	= 5;

ActionModel.prototype.handleNewActions = function (userId, actions, callback) {
	logger.debug('handleNewActions');
	var actionsToInsert = [];

	// iterate over each action and segment them by catalog item type
	for (var i = 0; i < actions.length; i++) {
		var action = actions[i];
		logger.debug("action: " + JSON.stringify(action));

		if (action.actionType == null) {
			logger.debug("NULL ACTION");
			continue;
		}

		switch (action.actionType) {
			case ActionModel.prototype.ACTION_TYPE_EPISODE_LISTEN:
			case ActionModel.prototype.ACTION_TYPE_EPISODE_FAVORITE:
			case ActionModel.prototype.ACTION_TYPE_EPISODE_DOWNLOAD:
				
				if (action.channelId && action.episodeId) {
					actionsToInsert.push({
						'channelId'	 	: apiHelper.toInternalId(action.channelId),
						'episodeId'	 	: apiHelper.toInternalId(action.episodeId),
						'actionType' 	: action.actionType
					});
				}				
				break;
			case ActionModel.prototype.ACTION_TYPE_CHANNEL_FAVORITE:
			case ActionModel.prototype.ACTION_TYPE_CHANNEL_SUBSCRIBE:
				
				if (action.channelId != null) {
					actionsToInsert.push({
						'channelId'	 	: apiHelper.toInternalId(action.channelId),
						'actionType' 	: action.actionType
					});
				}
				break;
			case ActionModel.prototype.ACTION_TYPE_COLLECTION_ADD:

				if (action.collectionId != null) {
					actionsToInsert.push({
						'collectionId'	: apiHelper.toInternalId(action.collectionId),
						'actionType' 	: action.actionType
					});
				}
				break;
			default:
				logger.error("Unknown action type encountered: " + action.actionType);
				break;
		}
	}

	// insert the actions
	if (actionsToInsert.length > 0) {
		ActionModel.prototype.insertActions(userId, actionsToInsert, callback);
	} else {
		callback(null, true);
	}
}

ActionModel.prototype.insertActions = function(userId, actions, callback) {
	logger.debug("insertActions");
	var bulk = mongo.collections.action.initializeUnorderedBulkOp();

	// iterate over actions, add
	for (var i = 0; i < actions.length; i++) {
		var actionObj = actions[i];
		var userObjId = ObjectID.createFromHexString(userId);
		var query = null;
		var update = null;

		switch (actionObj.actionType) {
			case ActionModel.prototype.ACTION_TYPE_EPISODE_LISTEN:
			case ActionModel.prototype.ACTION_TYPE_EPISODE_FAVORITE:
			case ActionModel.prototype.ACTION_TYPE_EPISODE_DOWNLOAD:
				var channelIdObj = ObjectID.createFromHexString(actionObj.channelId);
				var episodeIdObj = ObjectID.createFromHexString(actionObj.episodeId);
				var query = {
					'channelId'		: channelIdObj,
					'episodeId'		: episodeIdObj,
					'userId'		: userObjId,
					'actionType'	: actionObj.actionType
				};
				var update = {
					"$set": {
						"channelId"		: channelIdObj,
						'episodeId'		: episodeIdObj,
						"userId" 		: userObjId,
						"actionType"	: actionObj.actionType,
						"createdAt" 	: new Date()
					}
				};
				break;
			case ActionModel.prototype.ACTION_TYPE_CHANNEL_FAVORITE:
			case ActionModel.prototype.ACTION_TYPE_CHANNEL_SUBSCRIBE:
				var channelIdObj = ObjectID.createFromHexString(actionObj.channelId);
				var query = {
					'channelId'		: channelIdObj,
					'episodeId'		: { '$exists' : false },
					'userId'		: userObjId,
					'actionType'	: actionObj.actionType
				};
				var update = {
					"$set": {
						"channelId"		: channelIdObj,
						"userId" 		: userObjId,
						"actionType"	: actionObj.actionType,
						"createdAt" 	: new Date()
					}
				};
				break;
			case ActionModel.prototype.ACTION_TYPE_COLLECTION_ADD:
				var collectionIdObj = ObjectID.createFromHexString(actionObj.collectionId);
				var query = {
					'userId'			: userObjId,
					'collectionId'		: collectionIdObj,
					'actionType'		: actionObj.actionType
				};
				var update = {
					"$set": {
						'userId'		: userObjId,
						"collectionId"	: collectionIdObj,
						"actionType"	: actionObj.actionType,
						"createdAt" 	: new Date()
					}
				};
				break;
			default:
				logger.error("Unknown action type encountered: " + actionObj.actionType);
				break;
		}
		logger.debug("Query: " + JSON.stringify(query));
		logger.debug("Update: " + JSON.stringify(update));

		// add query and update to the bulk operation
		bulk.find(query).upsert().updateOne(update);
	}

	bulk.execute(function(err, result) {

		if (err) {
			logger.error("There was an error in insertActions: " + err.toString());
			callback(err);
			return;
		}
		logger.debug("Result: " + JSON.stringify(result));
		callback(null, true);
	});
}

module.exports = new ActionModel();