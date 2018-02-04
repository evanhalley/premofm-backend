package com.mainmethod.premo.billboard;

import com.mainmethod.premo.billboard.data.DatabaseManager;
import com.mainmethod.premo.billboard.worker.TrendingBillboardWorker;
import com.mainmethod.premo.util.Runner;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.property.PropertyUtility;
import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;

import java.io.IOException;

/**
 * Billboard builds podcast charts for PremoFM
 * Top Charts on a per category basis
 * Trending Charts
 * Created by evan on 6/8/15.
 */
public class Billboard implements Runner {

    private static Logger sLogger = Logger.getLogger(Billboard.class.getSimpleName());

    private DatabaseManager mDatabaseManager;

    public static void main(String[] args) {

        try {
            Billboard billboard = new Billboard();
            billboard.init();
            Runtime.getRuntime().addShutdownHook(new Runner.ShutdownHook(billboard));
            billboard.run();
        } catch (Exception e) {
            sLogger.error("Error encountered in main");
            sLogger.error(e.toString());
        }
    }

    @Override
    public void shutdown() {

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

            // initialize the database manager
            mDatabaseManager = new DatabaseManager();
        } catch (IOException e) {
            sLogger.error("Error encountered in init");
            sLogger.error(e.toString());
        }
    }

    public void run() throws InterruptedException {
        // let's start
        Thread thread = new Thread(new TrendingBillboardWorker(mDatabaseManager));
        thread.setName("TrendingBillboardWorker");
        thread.start();
        thread.join();
    }
}
