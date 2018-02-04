var Hashids = require("hashids");
var SALT = "ef7acb22-a54c-42df-bcb6-fe16993ba7d2";

function APIHelper() {

}

APIHelper.prototype.toExternalId = function(internalId) {
	var hashids = new Hashids(SALT);
	return hashids.encodeHex(internalId);
}

APIHelper.prototype.toInternalId = function(externalId) {
	var hashids = new Hashids(SALT);
	return hashids.decodeHex(externalId);
}

APIHelper.prototype.formatUser = function(user) {
	
	if (user) {
		delete user.information.password;
		user.id = this.toExternalId(user._id);
		delete user._id;
	}
	return user;
}

APIHelper.prototype.formatCategory = function(category) {
	
	if (category) {
		category.id = category._id;
		delete category._id;
	}
	return category;
}

APIHelper.prototype.formatChannels = function(channels) {
	var formattedChannels = [];

	if (channels) {

		for (var i = 0; i < channels.length; i++) {
			formattedChannels.push(this.formatChannel(channels[i]));
		}
	}
	return formattedChannels;
}

APIHelper.prototype.formatChannel = function(channel) {

	if (channel) {
		var id = this.toExternalId(channel._id);
		channel = channel.information;
		channel.id = id;
	}
	return channel;
}

APIHelper.prototype.formatEpisode = function(episode) {

	if (episode) {
		var id = this.toExternalId(episode._id);
		var channelId = this.toExternalId(episode.channelId);
		episode = episode.information;
		episode.id = id;
		episode.channelId = channelId;
		delete episode._id;
	}
	return episode;
}

APIHelper.prototype.formatEpisodeWithChannelData = function(episode) {

	if (episode) {
		var id = this.toExternalId(episode._id);
		var channelObject = episode.channel;
		channelObject.id = this.toExternalId(episode.channelId);
		episode = episode.information;
		episode.id = id;
		episode.channel = channelObject;
		delete episode._id;
	}
	return episode;
}

APIHelper.prototype.formatFilter = function(filter) {

	if (filter) {
		var id = this.toExternalId(filter._id);

		if (filter.collectionId && filter.collectionId.length > 0) {
			filter.collectionId = this.toExternalId(filter.collectionId);
		}
		filter.id = id;
		delete filter._id;
	}
	return filter;
}

APIHelper.prototype.formatCollection = function(collection) {

	if (collection) {
		collection.id = this.toExternalId(collection._id);
		delete collection._id;
		delete collection.userId;

		if (collection.channelIds) {
			for (var i = 0; i < collection.channelIds; i++) {
				collection.channelIds[i] = this.toExternalId(collection.channelIds[i]);
			}
		}

		if (collection.episodeIds) {
			for (var i = 0; i < collection.episodeIds; i++) {
				collection.episodeIds[i] = this.toExternalId(collection.episodeIds[i]);
			}
		}
	}
	return collection;
}

APIHelper.prototype.unformatCollection = function(collection) {

	if (collection) {

		if (collection.channelIds) {
			for (var i = 0; i < collection.channelIds; i++) {
				collection.channelIds[i] = this.toInternalId(collection.channelIds[i]);
			}
		}

		if (collection.episodeIds) {
			for (var i = 0; i < collection.episodeIds; i++) {
				collection.episodeIds[i] = this.toInternalId(collection.episodeIds[i]);
			}
		}
		collection.type = parseInt(collection.type);
		collection.isPublic = collection.isPublic === true;
	}
	return collection;
}

module.exports = new APIHelper();