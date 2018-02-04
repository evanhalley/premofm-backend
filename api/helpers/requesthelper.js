var logger 		= GLOBAL.logger;
var apiHelper 	= require("./apihelper");

function RequestHelper() {

}

RequestHelper.prototype.logRequest = function(request) {
	logger.info("*****Incoming connection from " + request.ip + "*****");
	logger.info("Request url: " + request.originalUrl);

	if (request.query) {
		logger.debug("Request query: " + JSON.stringify(request.query));
	}
}

RequestHelper.prototype.decodeBasicAuth = function(request) {
	var header = request.headers['authorization'] || '';
	var token = header.split(/\s+/).pop() || '';
    var auth = new Buffer(token, 'base64').toString();
    var parts = auth.split(/:/);
    var userId = parts[0];
    logger.debug("Decoded basic auth, user: " + userId);

	try {
		userId = apiHelper.toInternalId(userId);
	} catch (error) {
		logger.error('Error in decodeBasicAuth: ' + error);
		userId = -1;
	}

    return userId;
}

module.exports = new RequestHelper();