package com.mainmethod.premo.util.worker;

/**
 * Created by evan on 11/11/14.
 */
public abstract class Worker implements Runnable {

    private boolean mShutdownSignal = false;

    public void shutdown() {
        mShutdownSignal = true;
    }

    protected boolean getShutdownSignal() {
        return mShutdownSignal;
    }


}
