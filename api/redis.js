var redis 		= require("redis");
var config 		= GLOBAL.config;
var logger 		= GLOBAL.logger;

function Redis() { }

module.exports.init = function(callback) {
	var client = redis.createClient(config.redis.port, config.redis.host, {});

	client.on("error", function (err) {
	    logger.error("Error in init: " + err);
	    callback(error);
	    return
	});
	module.exports.client = client;
	callback(null);
};