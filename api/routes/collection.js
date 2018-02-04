var responseHelper 	= require("../helpers/responsehelper");
var requestHelper 	= require("../helpers/requesthelper");
var apiHelper 		= require("../helpers/apihelper");
var dbHelper		= require("../helpers/dbhelper");
var collectionModel = require("../models/collectionmodel");
var channelModel	= require("../models/channelmodel");
var episodeModel	= require("../models/episodemodel");
var userModel 		= require("../models/usermodel");

var config = GLOBAL.config;
var logger = GLOBAL.logger;

/**
 * TODO
 */
function Collection() {

}

/**
 * Merges the collection with the collectable data, ie join for channel and episode data
 */
function mergeCollectableData(collections, callback) {
	logger.info("mergeCollectableData");
	var mergedCollections = [];
	var episodeIds = [];
	var channelIds = [];
	var channelMap = [];
	var episodeMap = [];

	async.series(
		[	
			function(seriesCallback) {
				// collect the episode and channel IDs
				for (var i = 0; i < collections.length(); i++) {
					var collection = collections[i];

					switch (collection.type) {
						case collectionModel.COLLECTION_TYPE_CHANNEL:
							channelIds = channelIds.concat(collection.channelIds);
							break;
						case collectionModel.COLLECTION_TYPE_EPISODE:
							episodeIds = episodeIds.concat(collection.episodeIds);
							break;
						default:
							break;
					}
				}
			},
			function(seriesCallback) {
				// get episodes
				episodeModel.getEpisodesByObjectIds(episodeIds, function(error, episodes) {

					if (error) {
						return seriesCallback(error);
					}
					channelMap = dbHelper.objectArrayToMap(episodes);
					seriesCallback();
				});
			},
			function(seriesCallback) {
				// get channels
				channelModel.getChannelsByObjectIds(channelIds, function(error, channels) {

					if (error) {
						return seriesCallback(error);
					}
					channelMap = dbHelper.objectArrayToMap(channels);
					seriesCallback();
				});
			},
			function(seriesCallback) {
				// merge collections with channel and episode data
				for (var i = 0; i < collections.length(); i++) {
					var collection = collections[i];

					switch (collection.type) {
						case collectionModel.COLLECTION_TYPE_CHANNEL:
							var channels = [];

							for (var j = 0; j < collection.channelIds.length(); j++) {
								channels.push(channelMap[collection.channelIds[j]]);
							}
							collection['channels'] = channels;
							break;
						case collectionModel.COLLECTION_TYPE_EPISODE:
							var episodes = [];

							for (var j = 0; j < collection.episodeIds.length(); j++) {
								episodes.push(episodeMap[collection.episodeIds[j]]);
							}
							collection['episodes'] = episodes;
							break;
						default:
							break;
					}
					mergedCollections.push(collection);
				}
			}
		], 
		function(error, res) {
		
			if (error) {
				return callback(error);
			}
			callback(null, mergedCollections);
		});
}

function retrieveCollections(request, response) {
	var userId = requestHelper.decodeBasicAuth(request);
	
	collectionModel.getCollectionsByUserId(userId, function(error, collections) {

		if (error) {
			logger.error('There was an error in getCollections: ' + error.toString());
			return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
		}
		var collectionObj = {
			collections: [] 
		};

		for (var i = 0; i < collections.length; i++) {
			collectionObj.collections[i] = apiHelper.formatCollection(collections[i]);
		}
		responseHelper.sendGetResponse(response, 200, collectionObj);
	});
}

function retrieveCollection(request, response) {
	var collectionId = apiHelper.toInternalId(request.query.collectionId);

	collectionModel.getCollection(collectionId, function(error, collection) {

		if (error) {
			logger.error('There was an error in getCollection: ' + error.toString());
			return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
		}
		var collectionObj = apiHelper.formatCollection(collection);
		responseHelper.sendGetResponse(response, 200, collectionObj);
	});
}

function validateCollection(collection, isExisting) {
		
	if (collection == null || collection.length == 0) {
		return "Collection object is missing";
	}

	if (isExisting) {

		if (collection.id === undefined || collection.id.length == 0) {
			return "Collection ID for existing collection is missing";
		}
	}

	if (collection.name === undefined || collection.name.length == 0) {
		return "Collection name is missing";
	}

	if (collection.description === undefined) {
		return "Collection description is missing";
	}

	if (collection.isPublic === undefined || collection.isPublic.length == 0) {
		return "Collection isPublic is missing";
	}

	if (collection.isPublic !== true && collection.isPublic !== false) {
		return "Collection isPublic is invalid";
	}

	if (collection.type === undefined || collection.type.length == 0) {
		return "Collection type is missing";
	}
	
	var collectionType = parseInt(collection.type);

	if (collectionType !== collectionModel.COLLECTION_TYPE_CHANNEL &&
		collectionType !== collectionModel.COLLECTION_TYPE_EPISODE) {
		return "Collection type value is invalid";
	}
	logger.debug("channelIds: " + collection.channelIds);
	if (collectionType === collectionModel.COLLECTION_TYPE_CHANNEL && 
		(collection.channelIds === undefined)) {
		return "Channel IDs are missing for a channel collection";
	}

	if (collectionType === collectionModel.COLLECTION_TYPE_EPISODE && 
		(collection.episodeIds === undefined)) {
		return "Episode IDs are missing for a episode collection";
	}
	return null;
}

function validateUserCollectionEligibility(response, userId, collectionId, newCollection, writeCollectionFn) {
	
	if (newCollection.isPublic === true) {

		userModel.getProduct(userId, config.store.premofm_listener_product_id, function(error, product) {

			if (error) {
				logger.error('There was an error in validateUserCollectionEligibility: ' + error.toString());
				return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
			}

			if (!product) {
				return responseHelper.sendPostResponse(response, 200, false, 'User is not a paid user');
			}

			userModel.isCollectionCurator(userId, function(error, isCurator) {

				if (error) {
					logger.error('There was an error in validateUserCollectionEligibility: ' + error.toString());
					return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
				}

				if (!isCurator) {
					return responseHelper.sendPostResponse(response, 200, false, 'User is not a collection curator');
				}
				writeCollectionFn(userId, collectionId, newCollection, response);
			});
		});
	} else {
		writeCollectionFn(userId, collectionId, newCollection, response);
	}
}

Collection.prototype.getCollections = function(request, response) {
	requestHelper.logRequest(request);

	if (request.query && request.query.collectionId) {
		return retrieveCollection(request, response);
	}
	retrieveCollections(request, response);
}

Collection.prototype.createCollection = function(request, response) {
    requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	var failureReason = validateCollection(request.body, false);

	if (failureReason) {
		responseHelper.sendHttpError(response, 400, failureReason);
		return;
	}
	var newCollection = apiHelper.unformatCollection(request.body);
	
	var insertCollectionFn = function(userId, collectionId, newCollection, response) {
		collectionModel.insertCollection(userId, newCollection, function(error, insertedCollection) {

			if (error) {
				logger.error('There was an error in createCollection: ' + error.toString());
				responseHelper.sendHttpError(response, 500, 'Internal Server Error');
				return;
			}

			if (!insertedCollection) {
				responseHelper.sendObjectCreatedResponse(response, 200, false);
				return;
			}
			var id = apiHelper.toExternalId(insertedCollection._id);
			responseHelper.sendObjectCreatedResponse(response, 200, true, id);
		});
	}
	validateUserCollectionEligibility(response, userId, -1, newCollection, insertCollectionFn);
}

Collection.prototype.updateCollection = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	var failureReason = validateCollection(request.body, true);

	if (failureReason) {
		return responseHelper.sendHttpError(response, 400, failureReason);
	}
	var newCollection = apiHelper.unformatCollection(request.body);
	var collectionId = apiHelper.toInternalId(newCollection.id);

	var updateCollectionFn = function(userId, collectionId, newCollection, response) {
		collectionModel.updateCollection(userId, collectionId, newCollection, function(error, updatedCollection) {

			if (error) {
				logger.error('There was an error in updateCollection: ' + error.toString());
				return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
			}
			responseHelper.sendPostResponse(response, 200, updatedCollection);
		});
	};
	validateUserCollectionEligibility(response, userId, collectionId, newCollection, updateCollectionFn);
}

Collection.prototype.deleteCollection = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);

	if (request.body.id === undefined) {
		return responseHelper.sendHttpError(response, 400, 'Collection id missing');
	}
	var collectionId = apiHelper.toInternalId(request.body.id);

	collectionModel.deleteCollection(userId, collectionId, 
		function(error, collectionDeleted) {

		if (error) {
			logger.error('There was an error in deleteCollection: ' + error.toString());
			return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
		}
		responseHelper.sendPostResponse(response, 200, collectionDeleted);
	});
}

Collection.prototype.getTopCollections = function(request, response) {
	requestHelper.logRequest(request);

	collectionModel.getTopCollections(function(error, collections) {

		if (error) {
			logger.error('There was an error in getTopCollections: ' + error.toString());
			return responseHelper.sendHttpError(response, 500, 'Internal Server Error');
		}

		if (!collections) {
			return responseHelper.sendGetResponse(response, 200, { "collections" : [] });
		}

		for (var i = 0; i < collections.length; i++) {
			collections[i] = apiHelper.formatCollection(collections[i]);
		}
		responseHelper.sendGetResponse(response, 200, { "collections" : collections });
	});
}

module.exports = new Collection();