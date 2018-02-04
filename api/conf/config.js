var config = {
	max_users: 50,
	is_debug : true,
	server: {
		use_ssl	: false,
		port	: 8080,
		port_ssl: 8443,
		ip		: "127.0.0.1",
		ca		: '',
		key		: '',
		cert	: '' 
	},
	db: {
		user		: 'mongodb://db_url:27017/user',
		catalog 	: 'mongodb://db_url:27017/catalog',
		performance : 'mongodb://db_url:27017/performance'
	},
	redis: {
		host: '127.0.0.1',
		port: 6379,
	},
	logger: {
		level	: 'debug',
		path	: 'logs/',
		file	: 'premo-api-dev.log'
	},
	store: {
		google_play_license_key		: "",
		premofm_listener_product_id : ""
	}
};

module.exports = config;
