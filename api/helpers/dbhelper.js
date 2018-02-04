var config 		= GLOBAL.config;
var logger 		= GLOBAL.logger;
var ObjectID 	= require("mongodb").ObjectID;

var DBHelper = function() {};

DBHelper.prototype.hexStringArrayToObjectIdArray = function(hexStringArr) {
	var objectIdArr = [];

	if (hexStringArr == null) {
		return objectIdArr;
	}

	// convert to object IDs
	for (var i = 0; i < hexStringArr.length; i++) {
		objectIdArr[i] = ObjectID.createFromHexString(hexStringArr[i]);
	}
	return objectIdArr;
}

/**
 * Converts an array of ObjectIDs to an array of hex strings
 */
DBHelper.prototype.convertToHexStringArray = function(objectIds) {
	var hexStringArr = [];

	if (objectIds == null) {
		return hexStringArr;
	}

	for (var i = 0; i < objectIds.length; i++) {
		hexStringArr.push(objectIds[i].toHexString());
	}
	return hexStringArr;
}

DBHelper.prototype.objectArrayToMap = function(objectArr) {
	var map = {};

	if (objectArr == null) {
		return map;
	}

	for (var i = 0; i < objectArr.length; i++) {
		map[objectArr[i]._id.toHexString()] = objectArr[i];
	}
	return map;
}

DBHelper.prototype.objectArrayToHexStringArray = function(objectArr) {
	var hexStringArr = [];

	if (objectArr == null) {
		return hexStringArr;
	}

	for (var i = 0; i < objectArr.length; i++) {
		hexStringArr.push(objectArr[i]._id.toHexString());
	}
	return hexStringArr;
}

module.exports = new DBHelper();
