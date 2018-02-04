var express 		= require('express');
var fs 				= require('fs');
var http 			= require('http');
var https 			= require('https');
var winston 		= require('winston');
var passport 		= require("passport");
var strategy 		= require("passport-http").BasicStrategy;
var brute 			= require('express-brute');
var redisStore 		= require('express-brute-redis');
var bodyParser 		= require('body-parser');
var compression 	= require('compression');
var responseTime 	= require('response-time');

/* Configuration files */
GLOBAL.config = require('./conf/config');;
GLOBAL.logger = null;

var env = process.argv[2];

if (!env || env == 'undefined') {
	env = 'dev';
}

/* Logger configuration */
var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({
			json: false,
			timestamp: true,
			colorize: true,
			level: config.logger.level,
			humanReadableUnhandledException: true,
			handleExceptions: true
		}),
		new winston.transports.DailyRotateFile({
			filename: config.logger.path + config.logger.file,
			json: false,
			colorize: false,
			level: config.logger.level,
			humanReadableUnhandledException: true,
			handleExceptions: true
		})
	],
	exceptionHandlers: [
		new (winston.transports.Console)({
			json: false,
			timestamp: true,
			colorize: true,
			level: config.logger.level
		}),
		new winston.transports.DailyRotateFile({
			filename: config.logger.path + "fatal_" + config.logger.file,
			json: false,
			colorize: false,
			level: config.logger.level
		})
	],
	exitOnError: true
});
logger.debug = function(text) {

	if (GLOBAL.config.logger.level == 'debug') {
		logger.log("debug", text);
	}
}
GLOBAL.logger = logger;

/* Configure Passport */
passport.use(new strategy(

	function(userId, authToken, done) {
		logger.debug("Using passport to authenticate user: " + userId);
		var usermodel = require("./models/usermodel");
		var apiHelper = require('./helpers/apihelper');

		try {
			userId = apiHelper.toInternalId(userId);
			usermodel.validateAuthToken(userId, authToken, function(err, validated) {

				if (err) {
					return done("nope");
				}
				return done(null, validated);
			});
		} catch (error) {
			logger.error('Error occurred validating token: ' + error);
			return done('Not validated');
		}
	}
));
var passportConfig = {
	session: false
};
var premoAuth = passport.authenticate('basic', passportConfig);

/* Rate limit config */
var bruteOptions = {
	freeRetries: 1000,
    proxyDepth: 1,
    attachResetToRequest: false,
    refreshTimeoutOnRequest: false,
    minWait: 25 * 60 * 60 * 1000, // 1 day 1 hour (should never reach this wait time)
    maxWait: 25 * 60 * 60 * 1000, // 1 day 1 hour (should never reach this wait time)
    lifetime: 24 * 60 * 60, // 1 day (seconds not milliseconds)
    failCallback: function (req, res, next, nextValidRequestDate) {
	    res.send(429);
	}
};
var store = new redisStore(config.redis);
var bruteforce = new brute(store, bruteOptions);

/* Express instance configuration */
var app = express();
app.use(compression());
app.use(passport.initialize());
app.use(bodyParser.json());
app.use(responseTime());
app.disable('x-powered-by');

if (env == 'dev' || env == 'qa') {
	app.get('/1/sup', bruteforce.prevent, function(request, response) {
		response.status(200).send("<h1>What's up bruh.</h1>");
	});
}

// user account management
var user = require("./routes/user");
app.post('/1/user/authenticate', bruteforce.prevent, user.authenticate);
app.post('/1/user/sign_up', bruteforce.prevent, user.create);
app.post('/1/user/update_email', bruteforce.prevent, premoAuth, user.updateEmail);
app.post('/1/user/update_nickname', bruteforce.prevent, premoAuth, user.updateNickname);
app.post('/1/user/update_password', bruteforce.prevent, premoAuth, user.updatePassword);
app.post('/1/user/add_purchase', bruteforce.prevent, premoAuth, user.addPurchase);
app.get('/1/user', bruteforce.prevent, premoAuth, user.get);

// filter syncing
/* var filter = require("./routes/filter");
app.get('/1/filter', bruteforce.prevent, premoAuth, filter.getFilters);
app.post('/1/filter/sync', bruteforce.prevent, premoAuth, filter.syncFilters);*/

// collection syncing
var collection = require("./routes/collection");
app.get('/1/collection', bruteforce.prevent, premoAuth, collection.getCollections);
app.get('/1/collection/top', bruteforce.prevent, premoAuth, collection.getTopCollections);
app.post('/1/collection/create', bruteforce.prevent, premoAuth, collection.createCollection);
app.post('/1/collection/update', bruteforce.prevent, premoAuth, collection.updateCollection);
app.post('/1/collection/delete', bruteforce.prevent, premoAuth, collection.deleteCollection);

// channel management
var channel = require("./routes/channel");
app.get('/1/channel', bruteforce.prevent, premoAuth, channel.getChannel);
app.get('/1/channel/subscriptions', bruteforce.prevent, premoAuth, channel.subscriptions);
app.get('/1/channel/top', bruteforce.prevent, premoAuth, channel.topChannels);
app.get('/1/channel/trending', bruteforce.prevent, premoAuth, channel.trendingChannels);
app.post('/1/channel/subscribe', bruteforce.prevent, premoAuth, channel.subscribe);
app.post('/1/channel/bulk_subscribe', bruteforce.prevent, premoAuth, channel.bulkSubscribe);
app.post('/1/channel/unsubscribe', bruteforce.prevent, premoAuth, channel.unsubscribe);

// episode sync
var sync = require("./routes/sync");
app.post('/1/sync/episodes', bruteforce.prevent, premoAuth, sync.syncEpisodes);

// episode management
var episode = require("./routes/episode");
app.get('/1/episode', bruteforce.prevent, premoAuth, episode.getEpisodes);
app.get('/1/episodes', bruteforce.prevent, premoAuth, episode.getEpisodes); // deprecated
app.get('/1/episodes/trending', bruteforce.prevent, premoAuth, episode.getTrendingEpisodes);

// gcm push registration id saving
var device = require("./routes/device");
app.post('/1/app/register/google', bruteforce.prevent, premoAuth, device.registerGoogle);

// search
var search = require("./routes/search");
app.get('/1/search', bruteforce.prevent, premoAuth, search.query);

var action = require("./routes/action");
app.post('/1/action', bruteforce.prevent, premoAuth, action.postAction);

var category = require("./routes/category");
app.get('/1/category', bruteforce.prevent, premoAuth, category.getCategories);

var mongo = require("./mongo");
mongo.init(function(error) {

	if (error) {
		throw error;
	}
	var redis = require("./redis");
	redis.init(function(error) {

		if (error) {
			throw error;
		}

		if (config.is_debug == true) {
			logger.debug("**************************");
			logger.debug(JSON.stringify(config, null, 2));
			logger.debug("**************************");
		}

		if (config.server.use_ssl == true) {
			/* HTTPS configuration */
			var options = {
			  	ca					: fs.readFileSync(config.server.ca),
			  	key					: fs.readFileSync(config.server.key),
			  	cert				: fs.readFileSync(config.server.cert),
			  	requestCert			: true,
			  	rejectUnauthorized	: false
			};

			/* Crank dat server */
			https.createServer(options, app).listen(config.server.port_ssl, config.server.ip, function() {
				logger.info("Using SSL...");
				logger.info('Listening on port ' + config.server.port_ssl);
			});
		} else {
			http.createServer(app).listen(config.server.port, config.server.ip, function() {
			    logger.info('Listening on port ' + config.server.port);
			});
		}
	});
});
