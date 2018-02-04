package com.mainmethod.premo.util.object;

import org.bson.types.ObjectId;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Represents a push message
 * Created by evan on 1/15/15.
 */
public class Push {

    public enum PushType {
        NEW_EPISODES("NEW_EPISODES"),
        UPDATED_COLLECTION("UPDATED_COLLECTION");

        private String mLabel;

        PushType(String label) {
            mLabel = label;
        }

        public String getLabel() {
            return mLabel;
        }

        public static PushType getPushType(String label) {
            PushType pushType = null;

            if (PushType.NEW_EPISODES.getLabel().contentEquals(label)) {
                pushType = PushType.NEW_EPISODES;
            } else if (PushType.UPDATED_COLLECTION.getLabel().contentEquals(label)) {
                pushType = PushType.UPDATED_COLLECTION;
            }

            if (pushType == null) {
                throw new IllegalArgumentException("Unknown label encountered: " + label);
            }
            return pushType;
        }
    }

    private final ObjectId mId;
    private final PushType mPushType;

    public Push(ObjectId id, PushType pushType) {
        mId = id;
        mPushType = pushType;
    }

    public ObjectId getId() {
        return mId;
    }

    public PushType getPushType() {
        return mPushType;
    }

    @Override
    public String toString() {
        return "Push{" +
                "mId=" + mId +
                ", mPushType=" + mPushType +
                '}';
    }

    public String toRedisJson() {
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("id", mId);
        jsonObject.put("pushType", mPushType.getLabel());
        return jsonObject.toString();
    }

    /**
     * Translates JSON into a push object
     * @param pushJson
     * @return
     * @throws JSONException
     */
    public static Push fromRedisJson(String pushJson) throws JSONException{

        if (pushJson == null) {
            throw new IllegalArgumentException("Push JSON is null");
        }
        JSONObject json = new JSONObject(pushJson);
        PushType pushType = PushType.getPushType(json.getString("pushType"));
        ObjectId channelId = new ObjectId(json.getString("id"));
        Push push = new Push(channelId, pushType);
        return push;
    }
}
