var responseHelper 		= require("../helpers/responsehelper");
var requestHelper 		= require("../helpers/requesthelper");
var apiHelper 			= require("../helpers/apihelper");
var actionModel 		= require("../models/actionmodel");

var config = GLOBAL.config;
var logger = GLOBAL.logger;

/**
 * Action route handles reporting user actions to the performance database / action collection
 */
function Action() {

}

Action.prototype.postAction = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	var actions = request.body;

	if (actions == null || actions.length == 0 ) {
		responseHelper.sendHttpError(response, 400, "Data is missing");
		return;	
	}

	// get the userId
	actionModel.handleNewActions(userId, actions, function(err, result) {
			
		if (err) {
			logger.error("There was an error in postAction: " + error.toString());
			responseHelper.sendHttpError(response, 500, "Internal Server Error");
			return;
		}
		responseHelper.sendPostResponse(response, 200, true);
	});
}

module.exports = new Action();