package com.mainmethod.premo.util.context;

import org.apache.log4j.Logger;

import java.util.Properties;

/**
 * Stores objects relevant to a single instance of Point Guard
 * Created by evan on 6/11/14.
 */
public class ContextManager {

    private final static Logger sLogger = Logger.getLogger(ContextManager.class.getSimpleName());

    private static ContextManager sInstance;

    private Properties mProps;

    public static ContextManager getInstance() {

        if(sInstance == null) {
            sInstance = new ContextManager();
        }

        return sInstance;
    }

    private ContextManager() {
        mProps = new Properties();
    }

    /**
     * Adds properties
     * @param props
     */
    public void addProperties(Properties props) {
        if (props == null) {
            return;
        }
        mProps.putAll(props);
    }

    public Properties getProperties() {
        return mProps;
    }

    /**
     * Gets the property represented by the key
     * @param key
     * @return
     */
    public String getProperty(String key) {
        return mProps.getProperty(key);
    }
}