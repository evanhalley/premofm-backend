package com.mainmethod.premo.notifier.worker;

import com.mainmethod.premo.notifier.data.DatabaseManager;
import com.mainmethod.premo.notifier.data.object.Device;
import com.mainmethod.premo.notifier.push.GoogleCloudMessenger;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.http.HttpUtility;
import com.mainmethod.premo.util.object.Push;
import org.apache.log4j.Logger;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Responsible for sending a push message to a Cloud messaging service
 * Created by evan on 11/11/14.
 */
public class PushWorker implements Runnable {

    private static final Logger sLogger = Logger.getLogger(PushWorker.class.getSimpleName());
    private final DatabaseManager mDatabaseManager;
    private final RedisManager mRedisManager;
    private final Push mPush;
    private final HttpUtility mHttpUtility;

    public PushWorker(Push push, DatabaseManager databaseManager, RedisManager redisManager, HttpUtility httpUtility) {
        mPush = push;
        mDatabaseManager = databaseManager;
        mRedisManager = redisManager;
        mHttpUtility = httpUtility;
    }

    @Override
    public void run() {
        sLogger.info("Processing push queue item: " + mPush.toString());
        List<Device> devices;

        switch (mPush.getPushType()) {
            case NEW_EPISODES:
                devices = mDatabaseManager.getChannelSubscribedDevices(mPush.getId());
                break;
            case UPDATED_COLLECTION:
                devices = mDatabaseManager.getCollectionSubscribedDevices(mPush.getId());
                break;
            default:
                sLogger.warn("Unknown push type: " + mPush.getPushType());
                return;
        }

        if (devices.size() > 0) {
            List<String> googleDeviceIds = new ArrayList<>();

            devices.stream().forEach((device) -> googleDeviceIds.add(device.getDeviceId()));

            String[] googleDeviceIdArr = new String[googleDeviceIds.size()];
            googleDeviceIds.toArray(googleDeviceIdArr);
            sLogger.debug("Number of Google devices to send to: " + googleDeviceIds.size());

            // build a push message to send
            JSONObject data = buildPushMessage(mPush);

            // send the push message to Google/Apple users
            GoogleCloudMessenger googleCloudMessenger = new GoogleCloudMessenger(mRedisManager, mHttpUtility);
            googleCloudMessenger.send(googleDeviceIdArr, data);
        }
    }

    private JSONObject buildPushMessage(Push push) {
        JSONObject data = new JSONObject();

        if (push != null) {
            data.put("pushType", push.getPushType().getLabel());
        } else {
            sLogger.warn("Unknown instance of a push object encountered in buildPushMessage");
        }
        return data;
    }
}
