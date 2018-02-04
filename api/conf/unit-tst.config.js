var config = {
	is_debug : true,
	server: {
		use_ssl	: false,
		port	: 8080,
		port_ssl: 8443,
		ip		: '127.0.0.1',
		ca		: '',
		key		: '',
		cert	: '' 
	},
	db: {
		user		: 'mongodb://api:sup3rfly!@localhost:27017/user_tst',
		catalog 	: 'mongodb://api:sup3rfly!@localhost:27017/catalog_tst',
		performance : 'mongodb://api:sup3rfly!@localhost:27017/performance_tst'
	},
	redis: {
		host: '127.0.0.1',
		port: 6379,
	},
	logger: {
		level	: 'debug',
		path	: 'logs/',
		file	: 'premo-api-tst.log'
	},
	store: {
		google_play_license_key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkWwdQvubWAR7N01NDiEqNQCZEa5FenYruveWneFbqybqDeS8X/iN8pZHpOm40iJt56H68u87egX61X215/QJU2AWpaFr/Hvc++N9C0mIolYrhWsa/JtYdVJYe0/MxAqhfdP40UMK3Y06r21gYyNZF7hvBurOXpTJix5eW5R4vCr6kYsS2Lrbiy8dYPUBIvAwtjc4i1lFJN3ao4TM787RoPshomnNRqRQpG/Agse9xkjI0R1JDmT1ka9lJvzmxn7Tjkc8v3m8ANGxhtPQ5EsD21IrPoqDlOCiT5+N/hghbFLcNhP/C3LB0JMXjNh4/Cao+35d4SsRK3kUm7JYyRL+pwIDAQAB",
		premofm_listener_product_id : "premofm_listener.0000001"
	}
};

module.exports = config;
