var logger = GLOBAL.logger;

function ValidationHelper() {

}

ValidationHelper.prototype.isValid = function(value) {
	return value != null && value != undefined;
}

ValidationHelper.prototype.validateNewUserInformation = function(user) {
	logger.info("Validating new user information");
	var error = null;

	if (!user) {
		error = "User information not found";
	} else {
		var email = user.email;
		var password = user.password;

		if(!email || email.length == 0) {
			error = "Email address not found";
		}

		if(!password || password.length == 0) {
			error = "Password not found";
		}
	}
	return error;
}

ValidationHelper.prototype.isNumber = function(n) {

	if (n == null || n == undefined) {
		return false;
	}
	return /^-?[\d.]+(?:e-?\d+)?$/.test(n);
}

ValidationHelper.prototype.isArrayEmpty = function(array) {

	if (array == null || array == undefined || array.length == 0 || !Array.isArray(array)) {
		return true;
	}
	return false;
}

module.exports = new ValidationHelper();