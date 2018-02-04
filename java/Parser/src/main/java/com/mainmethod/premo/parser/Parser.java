package com.mainmethod.premo.parser;

import com.mainmethod.premo.parser.data.DatabaseManager;
import com.mainmethod.premo.parser.worker.DispatchWorker;
import com.mainmethod.premo.util.Runner;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.property.PropertyUtility;
import com.mainmethod.premo.util.worker.Worker;
import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;

import java.io.IOException;

/**
 * The Parser retrieves items from the Parse queue and parses them
 * Created by evan on 12/27/14.
 */
public class Parser implements Runner {

    private static Logger sLogger = Logger.getLogger(Parser.class.getSimpleName());

    // threads
    private Thread mDispatchThread;

    // workers
    private Worker mDispatchWorker;

    // the database manager
    private DatabaseManager mDatabaseManager;
    private RedisManager mRedisManager;

    public static void main(String[] args) {

        try {
            Parser parser = new Parser();
            parser.init();
            Runtime.getRuntime().addShutdownHook(new Runner.ShutdownHook(parser));
            parser.run();
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

            // initialize our dispatcher
            mDispatchWorker = new DispatchWorker(mDatabaseManager, mRedisManager);
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

        mDispatchThread.join();

        sLogger.info("All workers have terminated, shutting down...");
        mDatabaseManager.destroy();
    }
}
