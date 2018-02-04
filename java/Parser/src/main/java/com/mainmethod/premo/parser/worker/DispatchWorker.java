package com.mainmethod.premo.parser.worker;

import com.mainmethod.premo.parser.data.DatabaseManager;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.object.Parserable;
import com.mainmethod.premo.util.worker.Worker;
import com.mainmethod.premo.util.worker.WorkerBlockingExecutor;
import org.apache.log4j.Logger;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;

/**
 * Dispatches work to your channel worker threads
 * Created by evan on 11/7/14.
 */
public class DispatchWorker extends Worker {

    private static final Logger sLogger = Logger.getLogger(DispatchWorker.class.getSimpleName());
    private final ExecutorService mExecutorService;
    private final DatabaseManager mDatabaseManager;
    private final RedisManager mRedisManager;

    public DispatchWorker(DatabaseManager databaseManager,  RedisManager redisManager) {
        mExecutorService = new WorkerBlockingExecutor(
                Integer.parseInt(ContextManager.getInstance().getProperty("NUMBER_OF_PARSE_WORKERS")),
                new DispatchWorkerFactory());
        mDatabaseManager = databaseManager;
        mRedisManager = redisManager;
    }

    @Override
    public void run() {
        sLogger.info("Running");
        int pollTime = Integer.parseInt(ContextManager.getInstance().getProperty("WORKER_POLL_TIME"));

        while (true) {

            try {
                String parselableJson = mRedisManager.poll(RedisManager.PARSE_LIST);

                if (parselableJson != null) {
                    Parserable parserable = Parserable.fromJson(parselableJson);
                    sLogger.debug("Queueing item: " + parserable.toString());
                    ParseWorker parseWorker = new ParseWorker(parserable, mDatabaseManager, mRedisManager);
                    mExecutorService.execute(parseWorker);
                }

                if (getShutdownSignal()) {
                    sLogger.info("Terminating");
                    mExecutorService.shutdownNow();
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
        private int mCounter = 1;

        @Override
        public Thread newThread(Runnable r) {
            Thread thread = new Thread(r, "ParseWorker-" + mCounter++);
            thread.setPriority(Thread.MIN_PRIORITY);
            return thread;
        }
    }
}
