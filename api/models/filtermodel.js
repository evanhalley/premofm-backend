var config 		= GLOBAL.config;
var logger 		= GLOBAL.logger;
var mongo 		= require("../mongo");
var ObjectID 	= require("mongodb").ObjectID;

var FilterModel = function() {};

FilterModel.prototype.getFilters = function(userId, callback) {
	logger.debug("getFilters");

	var query = {
		"userId" : ObjectID.createFromHexString(userId)
	};
	var fields = {
		"userId": 0
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.filter.find(query, fields).toArray(function(err, results) {

		if (err) {
			logger.error("There was an error in getFilters: " + err.toString());
			callback(err, null);
			return;
		}
		callback(null, results);
	});
}

module.exports = new FilterModel();