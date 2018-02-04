var config 		= GLOBAL.config;
var logger 		= GLOBAL.logger;
var mongo 		= require("../mongo");
var ObjectID 	= require("mongodb").ObjectID;

var SALT_WORK_FACTOR = 11;

function DeviceModel() {};

/////////////////////////////////////
// Device related DB functions
/////////////////////////////////////

/**
 * Querys for a device ID, returns true if it exists
 */
DeviceModel.prototype.lookupDevice = function(deviceId, callback) {
	logger.info("lookupDeviceId");

	var query = {
		"deviceId" : deviceId
	};
	var fields = {
		"_id" : 0,
		"deviceId" : 1,
		"createdAt" : 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.device.findOne(query, fields, function(err, device) {

		if (err) {
			logger.error("There was an error in lookupDeviceId: " + err.toString());
			callback(err, null);
			return;
		}
		callback(null, device);
	});
}

/**
 * Inserts a device ID into the database
 */
DeviceModel.prototype.insertDevice = function(deviceId, callback) {
	logger.info("insertDevice");

	var device = {
		"deviceId" : deviceId,
		"createdAt" : new Date()
	};
	logger.debug("Insert: " + JSON.stringify(device));

	mongo.collections.device.insertOne(device, function(err, result) {

		if (err) {
			logger.error("There was an error in insertDeviceId: " + err.toString());
			callback(err, null);
			return;
		}
		var created = result.result.n == 1;
		logger.debug("Device created: " + created);
		callback(null, created);
	});
}

DeviceModel.prototype.addGoogleRegistrationId = function(userId, registrationId, callback) {
	logger.info("addGoogleRegistrationId");

	var query = {
		"_id": ObjectID.createFromHexString(userId)
	};
	var update = {
		"$push" : {
			"device.google": registrationId
		}
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Update: " + JSON.stringify(update));

	mongo.collections.user.updateOne(query, update, function(err, result) {

		if (err) {
			logger.error("There was an error in addGoogleRegistrationId: " + err.toString());
			callback(err, null);
			return;
		}
		var idWasAdded = result.result.n != null;
		callback(null, idWasAdded);
	});
}

DeviceModel.prototype.doesRegistrationIdExist = function(userId, registrationId, callback) {
	logger.info("doesRegistrationIdExist");

	var query = {
		"_id": ObjectID.createFromHexString(userId),
		"device.google": registrationId
	};
	var fields = {
		"_id": 1
	}
	logger.debug("Query: " + JSON.stringify(query));
	mongo.collections.user.findOne(query, fields, function(err, user) {

		if (err) {
			logger.error("There was an error in checkForDuplicateRegistrationId: " + err.toString());
			callback(err, null);
			return;
		}
		callback(null, user != null);
	});
}

module.exports = new DeviceModel();