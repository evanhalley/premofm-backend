package com.mainmethod.premo.retriever;

import com.mainmethod.premo.retriever.data.DatabaseManager;
import com.mainmethod.premo.retriever.worker.DispatchWorker;
import com.mainmethod.premo.retriever.worker.RetrieveWorker;
import com.mainmethod.premo.util.Runner;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.object.Retrievable;
import com.mainmethod.premo.util.property.PropertyUtility;
import com.mainmethod.premo.util.worker.Worker;
import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;

import java.io.IOException;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * Entry point for the Retriever app
 * Manages the flow of the entire application
 * Created by evan on 10/29/14.
 */
public class Retriever implements Runner {

    private static Logger sLogger = Logger.getLogger(Retriever.class.getSimpleName());

    // threads
    private Thread mRetrieverThread;
    private Thread mDispatchThread;

    // workers
    private Worker mRetrieverWorker;
    private Worker mDispatchWorker;

    // the database manager
    private DatabaseManager mDatabaseManager;
    private RedisManager mRedisManager;

    public static void main(String[] args) {

        try {
            Retriever retriever = new Retriever();
            Runtime.getRuntime().addShutdownHook(new ShutdownHook(retriever));
            retriever.init();
            retriever.run();
        } catch (Exception e) {
            sLogger.error("Error encountered in main");
            sLogger.error(e.toString());
        }
    }

        @Override
        public long getShutdownWaitTime() {
            return Long.parseLong(ContextManager.getInstance().getProperty("SHUTDOWN_WAIT_TIME"));
        }

    @Override
    public void shutdown() {
        mDispatchWorker.shutdown();
        mRetrieverWorker.shutdown();
    }

    public void init() {

        try {
            // initialize the logger
            PropertyConfigurator.configureAndWatch("conf/log4j.properties", 5000);

            // load the properties
            ContextManager contextManager = ContextManager.getInstance();
            contextManager.addProperties(PropertyUtility.readFile("conf/application.properties"));
            contextManager.addProperties(PropertyUtility.readFile("conf/database.properties"));
            contextManager.addProperties(PropertyUtility.readFile("conf/redis.properties"));

            // initialize shared queues
            BlockingQueue<Retrievable> retrievableQueue = new LinkedBlockingQueue<>(Integer.parseInt(
                    contextManager.getProperty("WORK_QUEUE_SIZE")));

            // initialize the DatabaseManager
            mDatabaseManager = new DatabaseManager();
            mRedisManager = new RedisManager();

            // initialize our retriever
            mRetrieverWorker = new RetrieveWorker(retrievableQueue, mDatabaseManager, mRedisManager);
            mRetrieverThread = new Thread(mRetrieverWorker);
            mRetrieverThread.setName("RetrieveWorker");

            // initialize our dispatcher
            mDispatchWorker = new DispatchWorker(retrievableQueue, mRedisManager);
            mDispatchThread = new Thread(mDispatchWorker);
            mDispatchThread.setName("DispatchWorker");
        } catch (IOException e) {
            sLogger.error("Error encountered in init");
            sLogger.error(e.toString());
        }
    }

    public void run() throws InterruptedException {
        // let's start the threads
        sLogger.info("Putting the workers to work");

        mDispatchThread.start();
        mRetrieverThread.start();

        mDispatchThread.join();
        mRetrieverThread.join();

        sLogger.info("All workers have terminated, shutting down...");
        mDatabaseManager.destroy();
    }
}
