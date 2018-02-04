var config 		= GLOBAL.config;
var logger 		= GLOBAL.logger;
var mongo 		= require("../mongo");
var ObjectID 	= require("mongodb").ObjectID;

var CategoryModel = function() {};

CategoryModel.prototype.getCategories = function(callback) {
	logger.debug("getCategories");

	var query = {};
	var fields = {
		"name": 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.category.find(query, fields).toArray(function(err, results) {

		if (err) {
			logger.error("There was an error in getCategories: " + err.toString());
			callback(err, null);
			return;
		}
		callback(null, results);
	});
}

module.exports = new CategoryModel();