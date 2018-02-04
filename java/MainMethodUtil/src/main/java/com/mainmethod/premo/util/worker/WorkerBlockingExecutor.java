package com.mainmethod.premo.util.worker;

import org.apache.log4j.Logger;

import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.Semaphore;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * Created by evan on 11/20/14.
 */
public class WorkerBlockingExecutor extends ThreadPoolExecutor {

    private Logger sLogger = Logger.getLogger(WorkerBlockingExecutor.class.getSimpleName());
    private final Semaphore mSemaphore;

    /**
     * Creates a BlockingExecutor which will block and prevent further
     * submission to the pool when the specified queue size has been reached.
     *
     * @param poolSize the number of the threads in the pool
     */
    public WorkerBlockingExecutor(final int poolSize, ThreadFactory threadFactory) {
        super(poolSize, poolSize, 0L, TimeUnit.MILLISECONDS,
                new LinkedBlockingQueue<>(), threadFactory);

        // the mSemaphore is bounding both the number of tasks currently executing
        // and those queued up
        mSemaphore = new Semaphore(2 * poolSize);
    }

    /**
     * Executes the given task.
     * This method will block when the mSemaphore has no permits
     * i.e. when the queue has reached its capacity.
     */
    @Override
    public void execute(final Runnable task) {
        boolean acquired = false;

        do {

            try {
                mSemaphore.acquire();
                acquired = true;
            } catch (final InterruptedException e) {
                sLogger.warn("InterruptedException whilst acquiring semaphore", e);
            }
        } while (!acquired);

        try {
            super.execute(task);
        } catch (final RejectedExecutionException e) {
            mSemaphore.release();
            throw e;
        }
    }

    /**
     * Method invoked upon completion of execution of the given Runnable,
     * by the thread that executed the task.
     * Releases a mSemaphore permit.
     */
    @Override
    protected void afterExecute(final Runnable r, final Throwable t) {
        super.afterExecute(r, t);
        mSemaphore.release();
    }
}
