package com.mainmethod.premo.notifier.data.object;

import org.bson.types.ObjectId;

/**
 * Created by evan on 1/15/15.
 */
public class Device {

    private final ObjectId mUserId;
    private final String mDeviceId;

    public Device(ObjectId userId, String deviceId) {
        mUserId = userId;
        mDeviceId = deviceId;
    }

    public String getDeviceId() {
        return mDeviceId;
    }

    public ObjectId getUserId() {
        return mUserId;
    }
}
