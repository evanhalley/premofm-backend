package com.mainmethod.premo.notifier.worker;

import com.mainmethod.premo.notifier.data.DatabaseManager;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.http.HttpUtility;
import com.mainmethod.premo.util.object.Push;
import com.mainmethod.premo.util.worker.Worker;
import org.apache.log4j.Logger;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;

/**
 * Dispatches work from the push queue to a push worker running in a
 *   separate thread
 * Created by evan on 11/11/14.
 */
public class DispatchWorker extends Worker {

    private static final Logger sLogger = Logger.getLogger(DispatchWorker.class.getSimpleName());
    private final ExecutorService mExecutorService;
    private final DatabaseManager mDatabaseManager;
    private final RedisManager mRedisManager;
    private final HttpUtility mHttpUtility;

    public DispatchWorker(DatabaseManager databaseManager, RedisManager redisManager, HttpUtility httpUtility) {
        mExecutorService = Executors.newFixedThreadPool(
                Integer.parseInt(ContextManager.getInstance().getProperty("NUMBER_OF_WORKERS")),
                new DispatchWorkerFactory()
        );
        mDatabaseManager = databaseManager;
        mRedisManager = redisManager;
        mHttpUtility = httpUtility;
    }

    @Override
    public void run() {
        sLogger.info("Running");
        int pollTime = Integer.parseInt(ContextManager.getInstance().getProperty("WORKER_POLL_TIME"));

        while (true) {
            try {
                String pushJson = mRedisManager.poll(RedisManager.PUSH_LIST);

                if (pushJson != null) {
                    Push push = Push.fromRedisJson(pushJson);
                    PushWorker pushWorker = new PushWorker(push, mDatabaseManager, mRedisManager, mHttpUtility);
                    mExecutorService.execute(pushWorker);
                }

                if (getShutdownSignal()) {
                    sLogger.info("Terminating");
                    mExecutorService.shutdown();
                    break;
                }
            } catch (Exception e) {
                sLogger.error(e);
            }
        }

        try {
            // tear down the executor service
            mExecutorService.awaitTermination(pollTime, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            sLogger.error("Error encountered awaiting termination");
            sLogger.error(e.toString());
        }
    }

    private class DispatchWorkerFactory implements ThreadFactory {

        @Override
        public Thread newThread(Runnable r) {
            Thread thread = new Thread(r, "PushWorker");
            thread.setPriority(Thread.MIN_PRIORITY);
            return thread;
        }
    }
}
