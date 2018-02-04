var responseHelper 	= require("../helpers/responsehelper");
var requestHelper 	= require("../helpers/requesthelper");
var apiHelper 		= require("../helpers/apihelper");
var dbHelper 		= require("../helpers/dbhelper");
var filterModel 	= require("../models/filtermodel");
var config = GLOBAL.config;
var logger = GLOBAL.logger;

/**
 * Endpoint used for getting and retrieving user created filters
 */
function Filter() {

}

Filter.prototype.getFilters = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);

	filterModel.getFilters(userId, function(error, filters) {

		if (error) {
			logger.error('There was an error in getFilters: ' + error.toString());
			responseHelper.sendHttpError(response, 500, 'Internal Server Error');
			return;
		}
		var filterObj = {
			filters: [] 
		};

		for (var i = 0; filters.length; i++) {
			filterObj.filters[i] = apiHelper.formatFilter(filters[i]);
		}
		responseHelper.sendGetResponse(response, 200, filterObj);
	});
}

Filter.prototype.createFilter = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	responseHelper.sendHttpError(response, 501, "Not Implemented");

	/*
	var body = request.body;

	// validate the filter
	var failureReason = validateFilter(body, false);

	if (failureReason) {
		responseHelper.sendHttpError(response, 400, failureReason);
		return;
	}

	// create the filter
	try {
		var date = new Date();
		var collectionId = null;

		if (body.collectionId.length > 0) {
			collectionId = apiHelper.toInternalId(collectionId);
		}

		var filter = {
			'userId'			: userId,
			'name'				: body.name,
			'order'				: body.order,
			'episodeStatuses'	: body.episodeStatuses,
			'downloadStatuses'  : body.downloadStatuses,
			'favorite'			: body.favorite,
			'collectionId'		: collectionId,
			'createdAt'			: date,
			'updatedAt'			: date
		};
		filter.insertFilter(filter, callback(error, insertedFilter) {

			if (error) {
				logger.error('There was an error in createFilter: ' + error.toString());
				responseHelper.sendHttpError(response, 500, 'Internal Server Error');
				return;
			}

		});
	}*/
}

Filter.prototype.updateFilter = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	responseHelper.sendHttpError(response, 501, "Not Implemented");
}

Filter.prototype.removeFilter = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	responseHelper.sendHttpError(response, 501, "Not Implemented");
}

function validateFilter(filter, isExisting) {
	
	if (isExisting) {

		if (filter.id == null || filter.id.length == 0) {
			return "Filter ID for existing filter is missing";
		}
	}

	if (filter.nane == null || filter.name.length == 0) {
		return "Filter name is missing";
	}

	if (filter.order == null || filter.order.length == 0 && filter.order < 0) {
		return "Filter order is missing or invalid";
	}

	if (filter.episodeStatuses == null) {
		return "Episode statuses are missing";
	}

	if (filter.downloadStatuses == null) {
		return "Download statuses are missing";
	}

	if (filter.favorite == null) {
		return "Favorite status is missing";
	}

	if (filter.collectionId == null) {
		return "Collection ID is missing";
	}

	return null;
}

module.exports = new Filter();
