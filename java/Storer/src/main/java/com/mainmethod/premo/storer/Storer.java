package com.mainmethod.premo.storer;

import com.mainmethod.premo.storer.data.DatabaseManager;
import com.mainmethod.premo.storer.worker.StoreWorker;
import com.mainmethod.premo.util.Runner;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.property.PropertyUtility;
import com.mainmethod.premo.util.worker.Worker;
import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;

import java.io.IOException;

/**
 * The storer takes things from the Redis queue and stores them
 * Created by evan on 12/27/14.
 */
public class Storer implements Runner {

    private static Logger sLogger = Logger.getLogger(Storer.class.getSimpleName());

    // threads
    private Thread mChannelThread;
    private Thread mRetrievableThread;
    private Thread mEpisodeThread;
    private Thread mErrorThread;
    private Thread mRegistrationIdDeleteThread;

    // workers
    private Worker mChannelWorker;
    private Worker mRetrievableWorker;
    private Worker mEpisodeWorker;
    private Worker mErrorWorker;
    private Worker mRegistrationIdDeleteWorker;

    // the database manager
    private DatabaseManager mDatabaseManager;
    private RedisManager mRedisManager;

    public static void main(String[] args) {

        try {
            Storer storer = new Storer();
            storer.init();
            Runtime.getRuntime().addShutdownHook(new ShutdownHook(storer));
            storer.run();
        } catch (Exception e) {
            sLogger.error("Error encountered in main");
            sLogger.error(e.toString());
        }
    }

    @Override
    public void shutdown() {
        mChannelWorker.shutdown();
        mRetrievableWorker.shutdown();
        mEpisodeWorker.shutdown();
        mErrorWorker.shutdown();
        mRegistrationIdDeleteWorker.shutdown();
    }

    @Override
    public long getShutdownWaitTime() {
        return Integer.parseInt(ContextManager.getInstance().getProperty("SHUTDOWN_WAIT_TIME"));
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

            // initialize the DatabaseManager
            mDatabaseManager = new DatabaseManager();
            mRedisManager = new RedisManager();

            // initialize our workers
            mChannelWorker = new StoreWorker(RedisManager.CHANNEL_LIST, mDatabaseManager, mRedisManager);
            mChannelThread = new Thread(mChannelWorker);
            mChannelThread.setName("ChannelStoreWorker");

            mRetrievableWorker = new StoreWorker(RedisManager.RETRIEVABLE_LIST, mDatabaseManager, mRedisManager);
            mRetrievableThread = new Thread(mRetrievableWorker);
            mRetrievableThread.setName("RetrievableStoreWorker");

            mEpisodeWorker = new StoreWorker(RedisManager.EPISODE_LIST, mDatabaseManager, mRedisManager);
            mEpisodeThread = new Thread(mEpisodeWorker);
            mEpisodeThread.setName("EpisodeStoreWorker");

            mErrorWorker = new StoreWorker(RedisManager.ERROR_LIST, mDatabaseManager, mRedisManager);
            mErrorThread = new Thread(mErrorWorker);
            mErrorThread.setName("ErrorStoreThread");
            mErrorThread.setPriority(Thread.MIN_PRIORITY);

            mRegistrationIdDeleteWorker = new StoreWorker(RedisManager.PUSH_REGISTRATION_DELETE_LIST, mDatabaseManager, mRedisManager);
            mRegistrationIdDeleteThread = new Thread(mRegistrationIdDeleteWorker);
            mRegistrationIdDeleteThread.setName("RegistrationDeleteThread");
            mRegistrationIdDeleteThread.setPriority(Thread.MIN_PRIORITY);
        } catch (IOException e) {
            sLogger.error("Error encountered in init");
            sLogger.error(e.toString());
        }
    }

    public void run() throws InterruptedException {
        // let's start the threads
        sLogger.info("Putting the workers to work");

        mChannelThread.start();
        mEpisodeThread.start();
        mRetrievableThread.start();
        mErrorThread.start();
        mRegistrationIdDeleteThread.start();

        mChannelThread.join();
        mEpisodeThread.join();
        mRetrievableThread.join();
        mErrorThread.join();
        mRegistrationIdDeleteThread.join();

        sLogger.info("All workers have terminated, shutting down...");
        mDatabaseManager.destroy();
    }
}
