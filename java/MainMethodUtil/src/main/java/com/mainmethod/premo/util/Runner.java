package com.mainmethod.premo.util;

import org.apache.log4j.Logger;

/**
 * Runner is a generic interface for a task that can be shutdown
 * Created by evan on 1/12/15.
 */
public interface Runner {

    void shutdown();
    long getShutdownWaitTime();

    /**
     * Shutsdown a task implementing the Runner interface
     */
    class ShutdownHook extends Thread {

        private static Logger sLogger = Logger.getLogger(ShutdownHook.class.getSimpleName());

        private final Runner mRunner;

        public ShutdownHook(Runner runner) {
            mRunner = runner;
        }

        @Override
        public void run() {
            sLogger.info("Shutting down");
            mRunner.shutdown();

            try {
                sleep(mRunner.getShutdownWaitTime());
            } catch (InterruptedException e) {
                sLogger.error("Error occurred while shutting down");
                sLogger.error(e.toString());
            }
        }
    }
}
