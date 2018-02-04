var logger = GLOBAL.logger;

function ResponseHelper() {

}

ResponseHelper.prototype.sendTokenValidationResponse = function(response, responseCode, success, userId, token) {
	logger.info("Sending (POST) response");
	var result = {};
	result.success = success;

	if (success && userId && token) {
		result.userId = userId;
		result.token = token;
	}
	sendResponse(response, responseCode, result);
}

ResponseHelper.prototype.sendObjectCreatedResponse = function(response, responseCode, success, id) {
	logger.info("Sending (POST) response");
	var result = {};
	result.success = success;

	if (success && id) {
		result.id = id;
	}
	sendResponse(response, responseCode, result);
}

ResponseHelper.prototype.sendBulkSubscribeResponse = function(response, responseCode, success, channels) {
	logger.info("Sending (POST) response");
	var result = {};
	result.success = success;
	result.channels = channels;
	sendResponse(response, responseCode, result);
}

ResponseHelper.prototype.sendPostResponse = function(response, responseCode, success, message) {
	logger.info("Sending (POST) response");
	var result = {};
	result.success = success;

	if (message) {
		result.message = message;
	}
	sendResponse(response, responseCode, result);
}

ResponseHelper.prototype.sendGetResponse = function(response, responseCode, data) {
	logger.info("Sending (GET) Response");
	sendResponse(response, responseCode, data);
}

ResponseHelper.prototype.sendHttpError = function(response, responseCode, message) {
	logger.info('Sending http error response: ' + responseCode + ", " +  message);
	sendResponse(response, responseCode, message);
}

function sendResponse(response, statusCode, data) {
	//logger.debug("Response: " + JSON.stringify(data));
	response.status(statusCode).send(data);

	if (response.get) {
		logger.info("Response Time: " + response.get("X-Response-Time"));
	}
}

module.exports = new ResponseHelper();