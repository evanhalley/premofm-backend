var channelModel 		= require("../models/channelmodel");
var responseHelper 		= require("../helpers/responsehelper");
var requestHelper 		= require("../helpers/requesthelper");
var validationHelper 	= require("../helpers/validationhelper");
var apiHelper 			= require("../helpers/apihelper");

var config = GLOBAL.config;
var logger = GLOBAL.logger;

/**
 * Search route allows the channel and episode database searching
 */
function Search() {

}

function searchChannels(query, limit, page, callback) {

	channelModel.searchChannels(query, limit, page, function(error, channels) {

		if (error) {
			logger.error("There was an error in searchChannels: " + error.toString());
			callback(error, null);
			return;
		}
		for (var i = 0; i < channels.length; i++) {
			channels[i] = apiHelper.formatChannel(channels[i]);
		}
		callback(null, channels);
	});
}

/**
 * Searches the channel and episode data store
 */
Search.prototype.query = function(request, response) {
	requestHelper.logRequest(request);
	var query = request.query.q;
	var limit = request.query.limit;
	var page = request.query.page;

	if (!query) {
		responseHelper.sendHttpError(response, 400, "Missing query parameter");
		return;
	}

	if (limit == null || limit == undefined) {
		limit = 25;
	}

	if (page == null || page == undefined) {
		page = 0;
	}

	searchChannels(query, limit, page, function(error, channels) {

		if (error) {
			logger.error("There was an error in query: " + error.toString());
			responseHelper.sendHttpError(response, 500, "Internal Server Error");
			return;
		}
		var results = {
			"channels" : channels
		};
		responseHelper.sendGetResponse(response, 200, results);
	});
}

module.exports = new Search();