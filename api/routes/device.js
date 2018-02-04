var deviceModel 		= require("../models/devicemodel");
var userModel			= require("../models/usermodel");
var responseHelper 		= require("../helpers/responsehelper");
var requestHelper 		= require("../helpers/requesthelper");
var validationHelper 	= require("../helpers/validationhelper");
var moment		 		= require("moment");

var config = GLOBAL.config;
var logger = GLOBAL.logger;

function Device() {

}

/**
  * Routes
  */
Device.prototype.registerGoogle = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	var registration = request.body;

	if (typeof registration === 'undefined' || !registration) {
		responseHelper.sendHttpError(response, 400, "Registration data is missing");
		return;
	}

	if (typeof registration.registrationId === 'undefined' || !registration.registrationId) {
		responseHelper.sendHttpError(response, 400, "Registration ID is missing");
		return;
	}

	if (typeof registration.deviceId === 'undefined' || !registration.deviceId) {
		responseHelper.sendHttpError(response, 400, "Device ID is missing");
		return;
	}

	userModel.getProduct(userId, config.store.premofm_listener_product_id, function(error, product) {

		if (error) {
			logger.error("There was an error in registerGoogle: " + error.toString());
			responseHelper.sendHttpError(response, 500, error);
			return;
		}

		// not a premofm premofm_listener_product_id
		if (typeof product === 'undefined' || !product) {
			Device.prototype.validateDevice(userId, registration.registrationId, 
				registration.deviceId, response);
		}

		// is a premofm listener
		else {
			Device.prototype.addRegistrationId(userId, registration.registrationId, response);
		}
	});
}

/**
  * Helper functions
  */
Device.prototype.isDeviceValid = function(device) {
	logger.info('isDeviceValid');
	return true;
	/*

	/** ensure we have all the requirements to validate devices 
	if (typeof device === 'undefined' || !device) {
		logger.debug('Device object is null, is valid');
		return true;
	}

	if (typeof device.deviceId === 'undefined' || !device.deviceId) {
		logger.debug('Device ID is null, not valid');
		return false;
	}

	if (typeof device.createdAt === 'undefined' || !device.createdAt) {
		logger.debug('CreatedAt is null, not valid');
		return false;
	}

	/** is the device created within the last two weeks 
	var twoWeeks = moment(new Date()).subtract(14, 'days');
	
	if (twoWeeks.isBefore(device.createdAt)) {
		logger.debug('Device is in last two weeks, is valid');
		return true;
	} else {
		logger.debug('Device created before two weeks, not valid');
	}
	return false;*/
}

Device.prototype.validateDevice = function(userId, registrationId, deviceId, response) {
	logger.debug('validateDevice');

	// lookup the device
	deviceModel.lookupDevice(deviceId, function(error, device) {

		if (error) {
			logger.error("There was an error in registerGoogle: " + error.toString());
			responseHelper.sendHttpError(response, 500, error);
			return;
		}

		// device doens't exist, let's insert it
		if (typeof device === 'undefined' || !device) {
			deviceModel.insertDevice(deviceId, function(error, result) {

				if (error) {
					logger.error("There was an error in registerGoogle: " + error.toString());
					responseHelper.sendHttpError(response, 500, error);
					return;
				}
				responseHelper.sendPostResponse(response, 200, result);
			});
		}

		// device exists, now determine if it's valid
		else {
			var deviceIsValid = Device.prototype.isDeviceValid(device);

			if (deviceIsValid) {
				Device.prototype.addRegistrationId(userId, registrationId, response);
			} else {
				responseHelper.sendPostResponse(response, 200, false);
			}
		}
	});
}

Device.prototype.addRegistrationId = function(userId, registrationId, response) {
	logger.debug('addRegistrationId');

	deviceModel.doesRegistrationIdExist(userId, registrationId, function(error, exists) {

		if (error) {
			logger.error("There was an error in registerGoogle: " + error.toString());
			responseHelper.sendHttpError(response, 500, error);
			return;
		} 

		if (exists == false) {
			logger.debug("register: no error and we have a userId");

			deviceModel.addGoogleRegistrationId(userId, registrationId, function(error, added) {

				if (error) {
					logger.error("There was an error in registerGoogle: " + error.toString());
					responseHelper.sendHttpError(response, 500, error);
					return;
				}
				responseHelper.sendPostResponse(response, 200, added);
			});
		} else {
			logger.debug("Registration ID already exists for user " + userId);
			responseHelper.sendPostResponse(response, 200, true);
		}
	});
}

module.exports = new Device();