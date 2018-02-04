var mongo 	= require('mongodb');
var config 	= GLOBAL.config;

module.exports.init = function(callback) {
    module.exports.collections = {};
    var client = mongo.MongoClient;

    var serverOptions = {
        db: {
            "poolSize" : 25,
            "socketOptions.connectTimeoutMS" : 10000,
            "socketOptions.socketTimeoutMS" : 10000,
            "autoReconnect" : true,
            "bufferMaxEntries" : 0
        }
    };

    client.connect(config.db.user, serverOptions, function(error, database) {

        if (error) {
            callback(error);
            return;
        }

        // collections from the User DB
        module.exports.collections.user = database.collection('user');
        module.exports.collections.sync = database.collection('sync');
        module.exports.collections.token = database.collection('token');
        module.exports.collections.filter = database.collection('filter');
        module.exports.collections.collection = database.collection('collection');
        module.exports.collections.device = database.collection('device');

        client.connect(config.db.catalog, serverOptions, function(error, database) {

            if (error) {
                callback(error);
                return;
            }

            // collections from the Catalog DB
            module.exports.collections.channel = database.collection('channel');
            module.exports.collections.episode = database.collection('episode');
            module.exports.collections.category = database.collection('category');
            
            client.connect(config.db.performance,  serverOptions, function(error, database) {

                if (error) {
                    callback(error);
                    return;
                }

                // collections from the Catalog DB
                module.exports.collections.action = database.collection('action');
                callback(null);
            });
        });
    });
};