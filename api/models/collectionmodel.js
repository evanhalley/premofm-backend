var config 		= GLOBAL.config;
var logger 		= GLOBAL.logger;
var mongo 		= require("../mongo");
var ObjectID 	= require("mongodb").ObjectID;
var redis 		= require("../redis");

var CollectionModel = function() {};

CollectionModel.prototype.COLLECTION_TYPE_CHANNEL 	= 0;
CollectionModel.prototype.COLLECTION_TYPE_EPISODE 	= 1;

/**
 * Returns an array of collections, sorted by total number of subscribers
 */
CollectionModel.prototype.getTopCollections = function(callback) {
	logger.info("Getting the top channels by number of subscribers");

	var query = {};
	var options = {
		"sort": {
			"metrics.subscribers" : -1
		},
		"limit": LIMIT
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Options:" + JSON.stringify(options));

	mongo.collections.collection.find(query, {}, options).toArray(function(error, collections) {

		if (error) {
			logger.error("There was an error in getTopSubscriptions: " + error.toString());
			callback(error, null);
			return;
		}
		callback(null, collections);
	});
}

CollectionModel.prototype.getCollectionsByUserId = function(userId, callback) {
	logger.debug("getCollectionsByUserId");

	var query = {
		"userId" : ObjectID.createFromHexString(userId)
	};
	var fields = {
		"userId": 0
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.collection.find(query, fields).toArray(function(error, results) {

		if (error) {
			logger.error("There was an error in getCollections: " + error.toString());
			callback(error, null);
			return;
		}
		callback(null, results);
	});
}

CollectionModel.prototype.getCollection = function(collectionId, callback) {
	logger.debug("Retrieving collection");

	var query = {
		"_id" : ObjectID.createFromHexString(collectionId)
	};
	var fields = {
		"userId": 0
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.collection.findOne(query, fields, function(error, result) {

		if (error) {
			logger.error("There was an error in getCollection: " + error.toString());
			callback(error, null);
			return;
		}
		callback(null, result);
	});
}

CollectionModel.prototype.insertCollection = function(userId, collection, callback) {
	logger.debug("Inserting collection");
	var date = new Date();

	var insert = {
		"userId" 		: ObjectID.createFromHexString(userId),
		"name" 			: collection.name,
		"description"	: collection.description,
		"isPublic"		: collection.isPublic,
		"type"			: collection.type,
		"channelIds"	: collection.channelIds,
		"episodeIds"	: collection.episodeIds,
		"keywords"		: collection.keywords,
		"createdAt"		: date,
		"updatedAt"		: date,
		"metrics"		: {
			"subscribers" : 0
		}
	};
	logger.debug("Insert: " + JSON.stringify(insert));

	mongo.collections.collection.insertOne(insert, function(error, result) {
		logger.debug("Result: " + JSON.stringify(result));
		var collectionCreated = false;

		if (error) {
			logger.error("There was an error in insertCollection: " + error.toString());
			callback(error, null);
			return;
		}
		collectionCreated = result.result.n == 1;
		logger.debug("Collection created: " + collectionCreated);
		callback(null, insert);
	});
}

CollectionModel.prototype.updateCollection = function(userId, collectionId, collection, callback) {
	logger.debug("Updating collection");
	var date = new Date();

	var query = {
		"_id"			: ObjectID.createFromHexString(collectionId),
		"userId"		: ObjectID.createFromHexString(userId)
	};

	var update = {
		"$set"	: {
			"name" 			: collection.name,
			"description"	: collection.description,
			"isPublic"		: collection.isPublic,
			"type"			: collection.type,
			"channelIds"	: collection.channelIds,
			"episodeIds"	: collection.episodeIds,
			"keywords"		: collection.keywords,
			"updatedAt"		: date
		}
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Update: " + JSON.stringify(update));

	mongo.collections.collection.updateOne(query, update, function(error, result) {
		logger.debug("Result: " + JSON.stringify(result));
		var collectionUpdated = false;

		if (error) {
			logger.error("There was an error in updateCollection: " + error.toString());
			callback(error, null);
			return;
		}
		collectionUpdated = result.result.n == 1;
		logger.debug("Collection updated: " + collectionUpdated);
		callback(null, collectionUpdated);
	});
}

CollectionModel.prototype.deleteCollection = function(userId, collectionId, callback) {
	logger.debug("Deleting collection");
	var date = new Date();

	var query = {
		"_id"			: ObjectID.createFromHexString(collectionId),
		"userId"		: ObjectID.createFromHexString(userId)
	};
	mongo.collections.collection.deleteOne(query, function(error, result) {
		logger.debug("Result: " + JSON.stringify(result));
		var collectionDeleted = false;

		if (error) {
			logger.error("There was an error in deleteCollection: " + error.toString());
			callback(error, null);
			return;
		}
		collectionDeleted = result.result.n == 1;
		logger.debug("Collection deleted: " + collectionDeleted);
		callback(null, collectionDeleted);
	});
}

/**
 * Returns true if the collection with the id is public
 */
CollectionModel.prototype.isCollectionPublic = function(collectionId, callback) {
	logger.info("isCollectionPublic");

	var query = {
		"_id": ObjectID.createFromHexString(collectionId)
	};
	var fields = {
		'isPublic' : 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.collection.findOne(query, fields, function(error, result) {

		if (error) {
			logger.error("There was an error in isCollectionPublic: " + error.toString());
			callback(error, null);
			return;
		}
		logger.debug(JSON.stringify(result));
		var isPublic = false;

		if (result) {
			isPublic = result.isPublic;
		}
		callback(null, isPublic);
	});
}

/**
 * Increases the subscriber count of a collection by 1
 */
CollectionModel.prototype.alterSubscriberCount = function(collectionId, count, callback) {
	logger.info("alterSubscriberCount");

	var query = {
		"_id": ObjectID.createFromHexString(collectionId)
	};
	var update = {
		"$inc": { "metrics.subscribers": count }
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Update: " + JSON.stringify(update));

	mongo.collections.collection.update(query, update, function(error, result) {

		if (error) {
			logger.error("There was an error in alterSubscriberCount: " + error.toString());
			callback(error);
			return;
		}
		var updated = result.result.n == 1;
		logger.debug("Result: " + updated);
		callback(null, updated);
	});
}

module.exports = new CollectionModel();