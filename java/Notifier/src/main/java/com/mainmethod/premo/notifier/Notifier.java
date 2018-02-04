package com.mainmethod.premo.notifier;

import com.mainmethod.premo.notifier.data.DatabaseManager;
import com.mainmethod.premo.util.Runner;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.http.HttpUtility;
import com.mainmethod.premo.util.property.PropertyUtility;
import com.mainmethod.premo.util.worker.Worker;
import com.mainmethod.premo.notifier.worker.DispatchWorker;
import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;

import java.io.IOException;

/**
 * Sends push notifications to user devices
 * Created by evan on 11/10/14.
 */
public class Notifier implements Runner {

    private static Logger sLogger = Logger.getLogger(Notifier.class.getSimpleName());

    // the database manager
    private DatabaseManager mDatabaseManager;
    private RedisManager mRedisManager;
    private HttpUtility mHttpUtility;

    // workers
    private Thread mDispatchThread;
    private Worker mDispatchWorker;

    public static void main(String[] args) {

        try {
            Notifier notifier = new Notifier();
            notifier.init();
            Runtime.getRuntime().addShutdownHook(new Runner.ShutdownHook(notifier));
            notifier.run();
        } catch (Exception e) {
            sLogger.error("Error encountered in main");
            sLogger.error(e.toString());
        }
    }

    @Override
    public void shutdown() {
        mDispatchWorker.shutdown();
    }

    @Override
    public long getShutdownWaitTime() {
        return Long.parseLong(ContextManager.getInstance().getProperty("SHUTDOWN_WAIT_TIME"));
    }

    public void init() {

        try {
            // initialize the logger
            PropertyConfigurator.configure(PropertyUtility.readFile("conf/log4j.properties"));

            // load the properties
            ContextManager contextManager = ContextManager.getInstance();
            contextManager.addProperties(PropertyUtility.readFile("conf/application.properties"));
            contextManager.addProperties(PropertyUtility.readFile("conf/database.properties"));
            contextManager.addProperties(PropertyUtility.readFile("conf/redis.properties"));
            contextManager.addProperties(PropertyUtility.readFile("conf/gcm.properties"));

            // initialize the database manager
            mDatabaseManager = new DatabaseManager();
            mRedisManager = new RedisManager();
            mHttpUtility = new HttpUtility();

            // initialize our dispatcher
            mDispatchWorker = new DispatchWorker(mDatabaseManager, mRedisManager, mHttpUtility);
            mDispatchThread = new Thread(mDispatchWorker);
            mDispatchThread.setName("Dispatcher");

        } catch (IOException e) {
            sLogger.error("Error encountered in init");
            sLogger.error(e.toString());
        }
    }

    public void run() throws InterruptedException {
        // let's start the threads
        sLogger.info("Putting the workers to work");
        mDispatchThread.start();
        mDispatchThread.join();
        sLogger.info("All workers have terminated, shutting down...");
        mDatabaseManager.destroy();
    }
}