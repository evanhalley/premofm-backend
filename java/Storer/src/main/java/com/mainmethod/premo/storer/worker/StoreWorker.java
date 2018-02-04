package com.mainmethod.premo.storer.worker;

import com.mainmethod.premo.storer.data.DatabaseManager;
import com.mainmethod.premo.util.date.DateParser;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.object.*;
import com.mainmethod.premo.util.worker.Worker;
import com.mongodb.client.model.WriteModel;
import org.apache.log4j.Logger;
import org.bson.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * Stores things into the database
 * Created by evan on 11/22/14.
 */
public class StoreWorker extends Worker {

    private static final Logger sLogger = Logger.getLogger(StoreWorker.class.getSimpleName());
    private static final int WORK_SIZE = 50_000;

    private final DatabaseManager mDatabaseManager;
    private final RedisManager mRedisManager;
    private final String mList;
    private final String mCollection;
    private final long mSleepTime;

    public StoreWorker(String list, DatabaseManager databaseManager, RedisManager redisManager) {
        mSleepTime = Long.parseLong(ContextManager.getInstance().getProperty("WORKER_POLL_TIME"));
        mDatabaseManager = databaseManager;
        mRedisManager = redisManager;
        mList = list;
        mCollection = getCollection(list);
    }

    @Override
    public void run() {
        sLogger.info("Running");
        long lastStoreTime = DateParser.now().getTime();
        int msBetweenWrites = Integer.parseInt(ContextManager.getInstance().getProperty("MS_BETWEEN_WRITES"));

        List<WriteModel<Document>> writes = new ArrayList<>(2 * WORK_SIZE);

        while (true) {

            try {
                // get the next channel to save
                List<String> jsonItems = mRedisManager.pop(mList, WORK_SIZE);

                if (jsonItems != null && jsonItems.size() > 0) {

                    jsonItems.stream().forEach((json) -> {

                        switch (mList) {
                            case RedisManager.CHANNEL_LIST:
                                writes.add(mDatabaseManager.generateChannelUpdateRecords(Channel.fromJson(json)));
                                break;
                            case RedisManager.EPISODE_LIST:
                                writes.add(mDatabaseManager.generateEpisodeInsertRecords(Episode.fromJson(json)));
                                break;
                            case RedisManager.RETRIEVABLE_LIST:
                                writes.add(mDatabaseManager.generateRetrievableUpdate(Retrievable.fromJson(json)));
                                break;
                            case RedisManager.ERROR_LIST:
                                writes.add(mDatabaseManager.generateErrorInsert(WorkerException.fromJson(json)));
                                break;
                            case RedisManager.PUSH_REGISTRATION_DELETE_LIST:
                                writes.add(mDatabaseManager.generateRegistrationIdDelete(PushResponse.fromJson(json)));
                                break;
                            default:
                                sLogger.error("Unknown list type: " + mList);
                        }
                    });
                } else {
                    // nothing in the queue, sleep
                    sleep();
                }

                // if the channel queue, let's store the channels
                if (lastStoreTime + msBetweenWrites <= DateParser.now().getTime() || getShutdownSignal()) {

                    if (writes.size() > 0) {
                        sLogger.debug(String.format("Writing %d records", writes.size()));
                        int[] results = mDatabaseManager.processBulkWrites(mCollection, writes);
                        sLogger.info(String.format("Bulk Write Result: %d insert(s) -- %d update(s)",
                                results[0], results[1]));
                        printPerformanceMetrics(writes.size(), lastStoreTime);
                        writes.clear();

                        if (jsonItems != null) {
                            jsonItems.clear();
                        }
                    }

                    if (mList == RedisManager.CHANNEL_LIST) {
                        mDatabaseManager.updateProcessingRecords();
                    }
                    lastStoreTime = DateParser.now().getTime();
                }

                if (getShutdownSignal() && writes.size() == 0) {
                    sLogger.info("Terminating");
                    break;
                }
            } catch (Exception e) {
                sLogger.error("Error occurred in StoreWorker.run", e);
            }
        }
    }

    private static String getCollection(String list) {

        switch (list) {
            case RedisManager.CHANNEL_LIST:
            case RedisManager.RETRIEVABLE_LIST:
                return "channel";
            case RedisManager.EPISODE_LIST:
                return "episode";
            case RedisManager.ERROR_LIST:
                return "error";
            case RedisManager.PUSH_REGISTRATION_DELETE_LIST:
                return "user";
            default:
                throw new IllegalArgumentException("Illegal redis list type: " + list);
        }
    }

    private void printPerformanceMetrics(int channels, long lastStoreTime) {
        long timeDifference = DateParser.now().getTime() - lastStoreTime;
        float storedPerMin = 60_000 * ((float) channels / (float) timeDifference);
        sLogger.info(String.format(">>> Average %s stored per minute: %.2f <<<", getCollection(mList),
                storedPerMin));
    }

    protected void sleep() {
        sLogger.debug("Sleeping for " + mSleepTime + "ms");

        try {
            Thread.sleep(mSleepTime);
        } catch (InterruptedException e) {
            sLogger.error("Error in processWork");
            sLogger.error(e.toString());
        }
    }
}
