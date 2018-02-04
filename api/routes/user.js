var responseHelper 		= require("../helpers/responsehelper");
var requestHelper 		= require("../helpers/requesthelper");
var validationHelper 	= require("../helpers/validationhelper");
var apiHelper 			= require("../helpers/apihelper");
var userModel 			= require("../models/usermodel");
var crypto 				= require('crypto');
var hat					= require('hat');

var config = GLOBAL.config;
var logger = GLOBAL.logger;

/**
 * The user route handles all API calls for user management related functions
 *   like creating new users, authentication, and device registration
 */
function User() {

}

User.prototype.authenticate = function(request, response) {
	requestHelper.logRequest(request);
	var credentials = request.body;

	if (!credentials || !credentials.email || credentials.email.length == 0 ||
		!credentials.password || credentials.password.length == 0) {
		responseHelper.sendHttpError(response, 400, "Missing email address/password");
		return;
	}

	userModel.authenticateUser(credentials, function(err, authenticated) {

		if (err) {
			logger.error("Error in authenticate: " + error.toString());
			responseHelper.sendHttpError(response, 500, null);
			return;
		}

		if (!authenticated) {
			responseHelper.sendPostResponse(response, 200, false);
			return;
		}

		userModel.getUserByEmail(credentials.email, function(err, user) {

			if (err) {
				logger.error("Error in authenticate: " + error.toString());
				responseHelper.sendHttpError(response, 500, null);
				return;
			}

			// generate and store a new authentication token
			var newToken = hat();

			userModel.addAuthToken(user._id.toHexString(), newToken, function(err, success) {

				if (err) {
					logger.error("Error in authenticate: " + error.toString());
					responseHelper.sendHttpError(response, 500, null);
					return;
				}
				responseHelper.sendTokenValidationResponse(response, 200, success, 
					apiHelper.toExternalId(user._id), newToken);
			});
		});
	});
}

User.prototype.create = function(request, response) {
	requestHelper.logRequest(request);
	var userToCreate = request.body;
	var validation = validationHelper.validateNewUserInformation(userToCreate);
	var result = {};

	if (validation) {
		responseHelper.sendHttpError(response, 400, validation);
		return;
	}

	userModel.getNumberOfUsers(function(error, count) {

		if (count > config.max_users && config.max_users != -1) {
			return responseHelper.sendPostResponse(response, 200, false, 
				"No more users can be created at this time");
		}

		userModel.getUserByEmail(userToCreate.email, function(error, user) {

			if (error) {
				logger.error("Error in create: " + error.toString());
				responseHelper.sendHttpError(response, 500, null);
				return;
			}

			if (user) {
				responseHelper.sendPostResponse(response, 200, false,
					"User with email address '" + userToCreate.email + "' already exists");
				return;
			}
			var newUser = {
				"email"		: userToCreate.email,
				"password"	: userToCreate.password,
				"nickname"	: userToCreate.nickname
			};

			userModel.createUser(newUser, function(error, newUser) {

				if (error) {
					logger.error("Error in create: " + error.toString());
					responseHelper.sendHttpError(response, 500, null);
					return;
				}
				responseHelper.sendPostResponse(response, 200, newUser != null);
			});
		});
	});
}

// TODO write unit tests, not implemented in API
User.prototype.updateCollectionCurator = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	var body = request.body;

	if (body == null || body.isCurator == null || body.isCurator.length == 0) {
		responseHelper.sendHttpError(response, 400, "isCurator value is not present to update");
		return;
	}
	var isCurator = body.isCurator;

	userModel.updateCollectionCurator(userId, isCurator, function(error, updated) {

		if (error) {
			logger.error("Error in updateCollectionCurator: " + error.toString());
			responseHelper.sendHttpError(response, 500, null);
			return;
		}
		responseHelper.sendPostResponse(response, 200, updated);
	});
}

User.prototype.updateNickname = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	var body = request.body;

	if (body == null || body.nickname == null || body.nickname.length == 0) {
		responseHelper.sendHttpError(response, 400, "Nickname value is not present to update");
		return;
	}
	var nickname = body.nickname;

	userModel.getUserByNickname(nickname, function(err, user) {

		if (err) {
			logger.error("Error in updateNickname: " + err.toString());
			responseHelper.sendHttpError(response, 500, "Internal Server Error");
			return;
		}

		if (user) {
			responseHelper.sendPostResponse(response, 200, false, "User with nickname " + 
				nickname + " already exists");
			return;
		}

		userModel.updateUserNickname(userId, nickname, function(error, updated) {

			if (error) {
				logger.error("Error in updateNickname: " + error.toString());
				responseHelper.sendHttpError(response, 500, null);
				return;
			}
			logger.debug("User " + nickname + " updated: " + updated);
			responseHelper.sendPostResponse(response, 200, updated);
		});
	});
}

User.prototype.updateEmail = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	var body = request.body;

	if (body == null || body.email == null || body.email.length == 0) {
		responseHelper.sendHttpError(response, 400, "Email value is not present to update");
		return;
	}
	var newEmail = body.email;

	userModel.getUserByEmail(newEmail, function(err, user) {

		if (err) {
			logger.error("Error in updateEmail: " + err.toString());
			responseHelper.sendHttpError(response, 500, "Internal Server Error");
			return;
		}

		if (user) {
			responseHelper.sendPostResponse(response, 200, false, "User with email address " + 
				newEmail + " already exists");
			return;
		}

		userModel.updateUserEmail(userId, newEmail, function(error, updated) {

			if (error) {
				logger.error("Error in updateEmail: " + error.toString());
				responseHelper.sendHttpError(response, 500, null);
				return;
			}
			logger.debug("User " + newEmail + " updated: " + updated);
			responseHelper.sendPostResponse(response, 200, updated);
		});
	});
}

User.prototype.updatePassword = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);

	// ensure we have all required parameters
	if (request.body == null || request.body.oldPassword == null 
		|| request.body.newPassword == null) {
		responseHelper.sendHttpError(response, 400, "Required fields are not present");
		return;
	}
	var oldPassword = request.body.oldPassword;
	var newPassword = request.body.newPassword;

	userModel.getUserById(userId, function(err, user) {

		if (err) {
			logger.error("Error in updatePassword: " + error.toString());
			responseHelper.sendHttpError(response, 500, null);
			return;
		}

		// verify the old password
		var credentials = {
			'email' 	: user.information.email,
			'password'	: oldPassword
		};
		logger.debug('Credentials: ' + JSON.stringify(credentials));

		userModel.authenticateUser(credentials, function(err, authenticated) {

			if (err) {
				logger.error("Error in updatePassword: " + error.toString());
				responseHelper.sendHttpError(response, 500, null);
				return;
			}

			if (authenticated == false) {
				responseHelper.sendPostResponse(response, 401, "Not authenticated");
				return;
			}

			logger.debug("UsreId: " + JSON.stringify(userId));

			userModel.updatePassword(userId, newPassword, function(err, result) {

				if (err) {
					logger.error("Error in updatePassword: " + error.toString());
					responseHelper.sendHttpError(response, 500, null);
					return;
				}
				logger.info("Result: " + JSON.stringify(result));
				responseHelper.sendPostResponse(response, 200, result);
			});
		});
	});
}

User.prototype.get = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);

	userModel.getUserById(userId, function(error, user) {

		if (error) {
			logger.error("Error in get: " + error.toString());
			responseHelper.sendHttpError(response, 500, null);
			return;
		}
		responseHelper.sendGetResponse(response, 200, {"user" : apiHelper.formatUser(user)});
	});
}

User.prototype.addPurchase = function(request, response) {
	requestHelper.logRequest(request);
	var userId = requestHelper.decodeBasicAuth(request);
	var signedData = request.body.signedData;
	var signature = request.body.signature;
	var developerPayload = request.body.developerPayload; // user ID
	var orderId = request.body.orderId;
	var productId = request.body.productId;

	if (signedData == null || signedData.trim().length == 0) {
		responseHelper.sendHttpError(response, 400, "Missing signedData");
		return;
	}

	if (signature == null || signature.trim().length == 0) {
		responseHelper.sendHttpError(response, 400, "Missing signature");
		return;
	}

	if (developerPayload == null || developerPayload.trim().length == 0) {
		responseHelper.sendHttpError(response, 400, "Missing developerPayload");
		return;
	}

	if (orderId == null || orderId.trim().length == 0) {
		responseHelper.sendHttpError(response, 400, "Missing orderId");
		return;
	}

	if (productId == null || productId.trim().length == 0) {
		responseHelper.sendHttpError(response, 400, "Missing productId");
		return;
	}
	// verify the data signature
	var verified = verifyDataSignature(config.store.google_play_license_key, signedData, signature);

	if (!verified) {
		logger.warn('addPurchase request was not verified from user ' + userId);
		responseHelper.sendPostResponse(response, 200, false);
		return;
	}

	userModel.containsPurchase(userId, productId, orderId, function(err, containsPurchase) {

		if (err) {
			logger.error("Error in addPurchase: " + err.toString());
			responseHelper.sendHttpError(response, 500, "Internal Server Error");
			return;
		}

		if (containsPurchase) {
			logger.warn("User " + userId + " already contains purchase with productId " + 
				productId + " and orderId " + orderId);
			responseHelper.sendPostResponse(response, 200, false);
			return;
		}

		userModel.updateUserPurchases(userId, productId, orderId, function(err, success) {

			if (err) {
				logger.error("Error in addPurchase: " + err.toString());
				responseHelper.sendHttpError(response, 500, "Internal Server Error");
				return;
			}
			responseHelper.sendPostResponse(response, 200, success);
		});
	});
}

/**
 * Verifies whether or the the signed data was signed by the private key
 */
function verifyDataSignature(publicKey, signedData, signature) {
	// let's decode the public key using some magic and sorcery
	var decodedPublicKey = getPublicKey(publicKey);

	// create the crypto verifier
	var verifier = crypto.createVerify('SHA1');

	// add the signed data
	verifier.update(signedData);

	// verify the data signature
	return verifier.verify(decodedPublicKey, signature, 'base64');
}

function getPublicKey(publicKey) {
	if (!publicKey) {
		return null;
	}
	var key = chunkSplit(publicKey, 64, '\n');
	var pkey = '-----BEGIN PUBLIC KEY-----\n' + key + '-----END PUBLIC KEY-----\n';
	return pkey;
}

function chunkSplit(str, len, end) {
	len = parseInt(len, 10) || 76;
	
	if (len < 1) {
		return false;
	}
	end = end || '\r\n';
	return str.match(new RegExp('.{0,' + len + '}', 'g')).join(end);
}

module.exports = new User();