var config 		= GLOBAL.config;
var logger 		= GLOBAL.logger;
var bcrypt 		= require("bcrypt");
var mongo 		= require("../mongo");
var ObjectID 	= require("mongodb").ObjectID;

var SALT_WORK_FACTOR = 11;

function UserModel() {};

/////////////////////////////////////
// User related DB functions
/////////////////////////////////////

function getUser(query, callback) {
	logger.debug('getUser');

	var fields = {
		'_id' : 1,
		'information' : 1,
		'channel' : 1,
		'statistics' : 1,
		'purchases' : 1,
		'collection' : 1
	};

	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.user.findOne(query, fields, function(err, user) {

		if (err) {
			logger.error("There was an error in getUser: " + err.toString());
			return callback(err, null);
		}
		logger.debug('User: ' + JSON.stringify(user));
		callback(err, user);
	});
}

/**
 * Returns the number of user accounts
 */
UserModel.prototype.getNumberOfUsers = function(callback) {
	logger.debug('getNumberOfUsers');

	mongo.collections.user.count(function(err, count) {
		
		if (err) {
			logger.error("There was an error in getNumberOfUsers");
			return callback(err, null);
		}
		callback(null, count);
	});
}

UserModel.prototype.isCollectionCurator = function(userId, callback) {
	logger.debug('isCollectionCurator');

	var query = {
		'_id' : ObjectID.createFromHexString(userId)
	};

	getUser(query, function(err, user) {

		if (err) {
			logger.error("There was an error in isCollectionCurator: " + err.toString());
			return callback(err, null);
		}
		logger.debug(JSON.stringify(user));
		callback(null, user.collection.isCurator);
	});
}

UserModel.prototype.authenticateUser = function(credentials, callback) {
	logger.debug('authenticateUser');

	this.getUserByEmail(credentials.email, function(err, user) {

		if (err) {
			logger.error("Error occurred in authenticateUser: " + err.toString());
			return callback(err, null);
		}

		if (!user) {
			callback(null, false);
			return;
		}

		bcrypt.compare(credentials.password, user.information.password, function(err, match) {

			if (err) {
				logger.error("Error occurred in authenticateUser: " + err.toString());
				callback(err, null);
				return;
			}
			logger.debug("Was user authenticated: " + match);
			callback(null, match);
		});
	});
}

UserModel.prototype.validateAuthToken = function(userId, authToken, callback) {
	logger.debug('validateAuthToken');

	var query = {
		'token' : authToken,
		'userId': ObjectID.createFromHexString(userId)
	};

	mongo.collections.token.findOne(query, function(err, token) {

		if (err) {
			logger.error("Error occurred in validateAuthToken: " + err.toString());
			return callback(err, null);
		}
		var validated = token != null;
		logger.debug('Token validated: ' + validated);
		callback(null, validated);
	});
}

UserModel.prototype.addAuthToken = function(userId, authToken, callback) {
	logger.debug('addAuthToken');

	var tokenDoc = {
		'userId' 	: ObjectID.createFromHexString(userId),
		'token'  	: authToken,
		'createdAt' : new Date()
	};

	mongo.collections.token.insertOne(tokenDoc, function(err, result) {
		var tokenCreated = false;

		if (err) {
			logger.error("There was an error in addAuthToken: " + err.toString());
			return callback(err, null);
		}
		tokenCreated = result.result.n == 1;
		logger.debug("Token created: " + tokenCreated);
		callback(err, tokenCreated);
	});
}

UserModel.prototype.updatePassword = function(userId, password, callback) {
	logger.debug('updatePassword');

	// hash/encrypt password
	bcrypt.hash(password, SALT_WORK_FACTOR, function(err, hash) {

		if (err) {
			logger.error("There was an error in updatePassword: " + err.toString());
			return callback(err, null);
		}

		var update = {
			'$set': {
				'information.password': hash,
				'updatedAt' : new Date()
			}
		};
		updateUser(userId, update, callback);
	});
}

UserModel.prototype.getUserById = function(userId, callback) {
	logger.debug('getUserById');

	var query = {
		"_id" : ObjectID.createFromHexString(userId),
	};

	getUser(query, function(err, user) {

		if (err) {
			logger.error("There was an error in getUserById: " + err.toString());
			return callback(err, null);
		}
		callback(err, user);
	});
}

UserModel.prototype.getUserByEmail = function(email, callback) {
	logger.debug('getUserByEmail');

	var query = {
		"information.email" : email,
	};

	getUser(query, function(err, user) {

		if (err) {
			logger.error("There was an error in getUserByEmail: " + err.toString());
			return callback(err, null);
		}
		callback(err, user);
	});
}

UserModel.prototype.getUserByNickname = function(nickname, callback) {
	logger.debug('getUserByNickname');

	var query = {
		"information.nickname" : nickname,
	};

	getUser(query, function(err, user) {

		if (err) {
			logger.error("There was an error in getUserByNickname: " + err.toString());
			return callback(err, null);
		}
		callback(err, user);
	});
}

UserModel.prototype.getUserId = function(email, callback) {
	logger.debug('getUserId');

	var query = {
		"information.email" : email,
	};
	var fields = {
		"_id": 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.user.findOne(query, fields, function(err, user) {

		if (err) {
			logger.error("There was an error in getUserId: " + err.toString());
			return callback(err, null);
		}

		if (!user || !user._id) {
			return callback(err, null);
		}
		logger.debug("Result: " + JSON.stringify(user));
		callback(err, user._id);
	});
}

UserModel.prototype.createUser = function(user, callback) {
	logger.debug('createUser');

	bcrypt.hash(user.password, SALT_WORK_FACTOR, function(err, hash) {

		if (err) {
			logger.error("There was an error in createUser: " + err.toString());
			return callback(err, null);
		}

		var newUser = {
			"information": {
				"email": user.email,
				"password" : hash
			},
			"channel" : {
				"subscriptions" : []
			},
			"collection" : {
				"isCurator" : false
			},
			"statistics" :{
				"episodesListened": 0,
				"secondsListened": 0
			},
			"device": {
				"google": []
			},
			"purchases": [],
			"createdAt": new Date(),
			"updatedAt": new Date(),
		};

		if (user.nickname != null && user.nickname.trim().length > 0) {
			newUser.information.nickname = user.nickname;
		}

		mongo.collections.user.insertOne(newUser, function(err, result) {
			var userCreated = false;

			if (err) {
				logger.error("There was an error in createUser: " + err.toString());
				callback(err, null);
				return;
			}
			userCreated = result.result.n == 1;
			logger.debug("User created: " + userCreated);
			callback(err, newUser);
		});
	});
}

UserModel.prototype.updateUserEmail = function(userId, email, callback) {
	logger.debug('updateUserEmail');

	var update = {
		"$set": {
			"information.email" : email,
			"updatedAt" : new Date()
		}
	};
	updateUser(userId, update, callback);
}

UserModel.prototype.updateUserNickname = function(userId, nickname, callback) {
	logger.debug('updateUserNickname');

	var update = {
		"$set": {
			"information.nickname" : nickname,
			"updatedAt" : new Date()
		}
	};
	updateUser(userId, update, callback);
}

UserModel.prototype.updateCollectionCurator = function(userId, isCurator, callback) {
	logger.debug('updateCollectionCurator');

	var update = {
		"$set": {
			"collection.isCurator" : isCurator,
			"updatedAt" : new Date()
		}
	};
	updateUser(userId, update, callback);
}

UserModel.prototype.updateUserPurchases = function(userId, productId, orderId, callback) {
	logger.debug('updateUserPurchases');

	var update = {
		'$push': {
			'purchases' : {
				'orderId' : orderId,
				'productId' : productId,
				'purchasedAt' : new Date()
			}
		}
	};
	updateUser(userId, update, callback);
}

UserModel.prototype.containsPurchase = function(userId, productId, orderId, callback) {
	logger.debug("containsPurchase");

	var query = {
		'_id' : ObjectID.createFromHexString(userId),
		'purchases' : {
			'$elemMatch' : {
				'orderId' : orderId,
				'productId' : productId
			}
		}
	}
	logger.debug("Query: " + JSON.stringify(query));

	mongo.collections.user.find(query).toArray(function(err, items) {

		if (err) {
			logger.error("There was an error in containsPurchase: " + err.toString());
			return callback(err, null);
		}
		var containsPurchase = false;
		logger.debug(JSON.stringify(items));
		if (items != null && items.length > 0) {
			containsPurchase = true;
		}
		callback(null, containsPurchase);
	});
}

function updateUser(userId, update, callback) {
	logger.debug('updateUser');

	var query = {
		"_id" : ObjectID.createFromHexString(userId)
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Update: " + JSON.stringify(update));

	mongo.collections.user.update(query, update, function(err, result) {
		var userUpdated = false;

		if (err) {
			logger.error("There was an error in setUserPremium: " + err.toString());
			return callback(err, null);
		}
		userUpdated = result.result.n != null;
		logger.debug("User updated: " + userId);
		callback(err, userUpdated);
	});
}

UserModel.prototype.getUsers = function(userIds, callback) {
	logger.debug('getUsers');

	var query = {
		"_id": { "$in": userIds }
	};
	logger.debug("Query: " + JSON.stringify(query));
	mongo.collections.user.find(query).toArray(function(err, items) {

		if (err) {
			logger.error("There was an error getUsers: " + err.toString());
			return callback(err, null);
		}
		callback(null, items);
	});
}

/**
 * Returns the subscriptions array from the user profile
 */
UserModel.prototype.getSubscriptionIds = function(userId, callback) {
	logger.debug('getSubscriptionIds');

	// get the user's subscriptions IDs
	var query = {
		"_id": ObjectID.createFromHexString(userId)
	};
	var fields = {
		"channel.subscriptions": 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.user.findOne(query, fields, function(error, result) {

		if (error) {
			logger.error("There was an error in getSubscriptionIds: " + error.toString());
			callback(error, null);
			return;
		}
		logger.debug("getSubscriptionIds result: " + JSON.stringify(result));
		var subscriptionIds = [];

		if (result && result.channel && result.channel.subscriptions) {
			subscriptionIds = result.channel.subscriptions;
		}
		callback(null, subscriptionIds);
	});
}

UserModel.prototype.getProduct = function(userId, productId, callback) {
	logger.debug("getProduct");

	// get the user's subscriptions IDs
	var query = {
		"_id" : ObjectID.createFromHexString(userId),
		"purchases" : { 
			"$elemMatch" : { "productId" : productId }
		}
	};
	var fields = {
		"purchases" : 1
	};
	logger.debug("Query: " + JSON.stringify(query));
	logger.debug("Fields: " + JSON.stringify(fields));

	mongo.collections.user.findOne(query, fields, function(error, result) {
		logger.debug("Result: " + JSON.stringify(result));

		if (error) {
			logger.error("There was an error in getProduct: " + error.toString());
			callback(error, null);
			return;
		}
		var product = null;

		if (typeof result === 'undefined' || result == null || 
			typeof result.purchases === 'undefined' || !result.purchases ||
			result.purchases.length == 0) {
			callback(null, null);
		} else {
			callback(null, result.purchases[0]);
		}
	});
}

module.exports = new UserModel();