package com.mainmethod.premo.retriever.worker;

import com.mainmethod.premo.retriever.data.DatabaseManager;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.object.Retrievable;
import com.mainmethod.premo.util.worker.Worker;
import org.apache.log4j.Logger;

import java.util.List;
import java.util.concurrent.BlockingQueue;

/**
 * Gets channels to process from the database, stores them in the channel queue
 * Created by evan on 11/2/14.
 */
public class RetrieveWorker extends Worker {

    private static final Logger sLogger = Logger.getLogger(RetrieveWorker.class.getSimpleName());
    private final DatabaseManager mDatabaseManager;
    private final RedisManager mRedisManager;
    private final BlockingQueue<Retrievable> mRetrievableQueue;
    private final long mSleepTime;
    private final long mMaxParseQueueSize;

    public RetrieveWorker(BlockingQueue<Retrievable> retrievableQueue, DatabaseManager databaseManager,
                          RedisManager redisManager) {
        mSleepTime = Long.parseLong(ContextManager.getInstance().getProperty("RETRIEVER_SLEEP_TIME"));
        mMaxParseQueueSize = Long.parseLong(ContextManager.getInstance().getProperty("MAX_PARSE_QUEUE_SIZE"));
        mRetrievableQueue = retrievableQueue;
        mRedisManager = redisManager;
        mDatabaseManager = databaseManager;
    }

    @Override
    public void run() {
        sLogger.info("Running");

        while (true) {

            try {

                if (mRedisManager.size(RedisManager.PARSE_LIST) < mMaxParseQueueSize) {
                    sLogger.debug("Remaining capacity: " + mRetrievableQueue.remainingCapacity());
                    List<Retrievable> retrievableList = mDatabaseManager.getChannelsToProcess(
                            mRetrievableQueue.remainingCapacity());

                    if (retrievableList != null && retrievableList.size() > 0) {
                        sLogger.debug("Number of channels to queue: " + retrievableList.size());
                        retrievableList.stream().forEach((retrievable) -> {

                            try {
                                mRetrievableQueue.put(retrievable);
                            } catch (InterruptedException e) {
                                sLogger.error("Error in processWork");
                                sLogger.error(e.toString());
                            }
                        });
                    }
                } else {
                    sLogger.debug("Parse list queue is full");
                }

                sleep();

                if (getShutdownSignal()) {
                    sLogger.info("Terminating");
                    break;
                }
            } catch (Exception e) {
                sLogger.error("Error in processWork");
                sLogger.error(e.toString());
            }
        }
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
