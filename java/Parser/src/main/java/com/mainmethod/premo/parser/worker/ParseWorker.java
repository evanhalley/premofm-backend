package com.mainmethod.premo.parser.worker;

import com.mainmethod.premo.parser.data.DatabaseManager;
import com.mainmethod.premo.parser.feed.SAXFeedHandler;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.object.*;
import com.mainmethod.premo.util.worker.Worker;
import org.apache.log4j.Logger;

import java.util.Date;
import java.util.List;

/**
 * The channel worker completely processes a podcast channel
 * 1) Parses podcast XML into objects
 * 2) Looks for new episodes
 * 3) Saves channel and episodes to database
 * 4) Adds subscribers to the push queue
 * Created by evan on 11/7/14
 */
public class ParseWorker extends Worker {

    private static final Logger sLogger = Logger.getLogger(ParseWorker.class.getSimpleName());
    private final Parserable mParserable;
    private final DatabaseManager mDatabaseManager;
    private final RedisManager mRedisManager;

    public ParseWorker(Parserable parserable, DatabaseManager databaseManager, RedisManager redisManager) {
        mParserable = parserable;
        mDatabaseManager = databaseManager;
        mRedisManager = redisManager;
    }

    @Override
    public void run() {
        sLogger.debug("Parse queue item processing starting: " + mParserable);
        Date startedProcessingAt = new Date();
        Channel channel = null;

        try {
            /*** 0) Get the channel & episodes from the database for future reference ***/
            channel = mDatabaseManager.getChannel(mParserable.getChannelId());

            if (channel == null) {
                throw new WorkerException(mParserable.getChannelId(),
                        WorkerException.ExceptionType.ERROR_DATABASE,
                        String.format("Channel not found: %s", mParserable.getChannelId()));
            }

            List<Episode> existingEpisodes = mDatabaseManager.getEpisodes(channel.getId());

            if (existingEpisodes != null) {
                channel.addExistingEpisodes(existingEpisodes);
            }

            /*** 2) Get the channel's XML data ***/
            String channelData = mParserable.getData();

            /***3) parse a channel's RSS feed ***/
            List<Episode> episodeList = new SAXFeedHandler().processXml(channel, channelData);

            if (episodeList != null && episodeList.size() > 0) {
                /*** 4) process new and existing episodes ***/
                processNewEpisodes(channel, episodeList);
                setPodcastType(channel);
                channel.clearExistingEpisodes();
            } else {
                sLogger.debug("No new episodes for channel: " + channel.getTitle());
            }

            // add new episodes to redis episode list
            channel.getNewEpisodes().stream().forEach((episode) -> {
                mRedisManager.push(RedisManager.EPISODE_LIST, episode.toJson());
            });

            if (channel.getNewEpisodes().size() > 0) {
                Push push = new Push(channel.getId(), Push.PushType.NEW_EPISODES);
                mRedisManager.push(RedisManager.PUSH_LIST, push.toRedisJson());
            }

            // add the channel to the redis database
            mRedisManager.push(RedisManager.CHANNEL_LIST, channel.toJson());
        } catch (WorkerException e){
            sLogger.warn("WorkerException encountered");
            sLogger.warn(e.toString());
        }

        /*** 5) print some statistics ***/
        long duration = new Date().getTime() - startedProcessingAt.getTime();
        sLogger.debug("Channel processing completed: " + channel.toString());
        sLogger.debug("New episodes: " + channel.getNewEpisodes().size());
        sLogger.debug("Time taken: " + duration + "ms");
    }

    /**
     * Set's the podcast type for a channel by examining the mime type of a single episode
     * If not episodes are available, the podcast type isn't update
     * @param channel
     */
    private void setPodcastType(Channel channel) {
        Episode episode;

        if (channel.getExistingEpisodes() != null && channel.getExistingEpisodes().size() > 0) {
            episode = channel.getExistingEpisodes().iterator().next();
        } else if (channel.getNewEpisodes() != null && channel.getNewEpisodes().size() > 0) {
            episode = channel.getNewEpisodes().iterator().next();
        } else {
            return;
        }
        String mimeType = episode.getMimeType();

        if (mimeType != null) {

            if (mimeType.startsWith("audio")) {
                channel.setPodcastType(PodcastType.AUDIO);
            } else if (mimeType.startsWith("video")) {
                channel.setPodcastType(PodcastType.VIDEO);
            }
        }
    }

    /**
     * Determines which episodes are old and which are new
     * @param channel
     * @param episodeList
     */
    private void processNewEpisodes(Channel channel, List<Episode> episodeList) {

        for (int i = 0; i < episodeList.size(); i++) {

            if (!channel.doesEpisodeExist(episodeList.get(i))) {
                channel.addNewEpisode(episodeList.get(i));
            }
        }
    }
}
