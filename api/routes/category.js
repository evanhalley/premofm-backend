var responseHelper 	= require("../helpers/responsehelper");
var requestHelper 	= require("../helpers/requesthelper");
var apiHelper 		= require("../helpers/apihelper");
var categoryModel 	= require("../models/categorymodel");	

var config = GLOBAL.config;
var logger = GLOBAL.logger;

/**
 * Category returns podcast channel categories
 */
function Category() {

}

Category.prototype.getCategories = function(request, response) {
	requestHelper.logRequest(request);

	categoryModel.getCategories(function(error, results) {

		if (error) {
			logger.error("There was an error in getCategories: " + error.toString());
			responseHelper.sendHttpError(response, 500, "Internal Server Error");
			return;
		}
		var categories = [];

		for (var i = 0; i < results.length; i++) {
			categories.push(apiHelper.formatCategory(results[i]));
		}
		responseHelper.sendGetResponse(response, 200, { "categories" : categories });
	});
}

module.exports = new Category();