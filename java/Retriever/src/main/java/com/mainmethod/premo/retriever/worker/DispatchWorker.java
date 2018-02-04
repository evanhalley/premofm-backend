package com.mainmethod.premo.retriever.worker;

import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.object.Retrievable;
import com.mainmethod.premo.util.worker.Worker;
import com.mainmethod.premo.util.worker.WorkerBlockingExecutor;
import org.apache.log4j.Logger;

import java.net.UnknownHostException;
import java.util.concurrent.BlockingQueue;
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
    private final RedisManager mRedisManager;
    private final BlockingQueue<Retrievable> mRetrievableQueue;

    public DispatchWorker(BlockingQueue<Retrievable> retrievableQueue, RedisManager redisManager)
            throws UnknownHostException {
        super();
        mRetrievableQueue = retrievableQueue;
        mExecutorService = new WorkerBlockingExecutor(
                Integer.parseInt(ContextManager.getInstance().getProperty("NUMBER_OF_CHANNEL_WORKERS")),
                new DispatchWorkerFactory());
        mRedisManager = redisManager;
    }

    @Override
    public void run() {
        sLogger.info("Running");
        int pollTime = Integer.parseInt(ContextManager.getInstance().getProperty("WORKER_POLL_TIME"));

        while (true) {

            try {
                Retrievable retrievable = mRetrievableQueue.poll(pollTime, TimeUnit.MILLISECONDS);

                if (retrievable != null) {
                    sLogger.debug("Queueing retrieverMetadata: " + retrievable.getChannelTitle());
                    ChannelWorker feedWorker = new ChannelWorker(retrievable, mRedisManager);
                    mExecutorService.execute(feedWorker);
                }

                if (getShutdownSignal()) {
                    sLogger.info("Terminating");
                    mExecutorService.shutdownNow();
                    break;
                }
            } catch (Exception e) {
                sLogger.error("Error encountered while during dispatch");
                sLogger.error(e.toString());
            }
        }
    }

    private class DispatchWorkerFactory implements ThreadFactory {
        private int mCounter = 1;

        @Override
        public Thread newThread(Runnable r) {
            Thread thread = new Thread(r, "ChannelWorker-" + mCounter++);
            thread.setPriority(Thread.MIN_PRIORITY);
            return thread;
        }
    }
}
