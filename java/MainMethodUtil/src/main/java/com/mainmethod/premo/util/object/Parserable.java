package com.mainmethod.premo.util.object;

import org.bson.types.ObjectId;
import org.json.JSONObject;

/**
 * Created by evan on 7/5/15.
 */
public class Parserable {

    private ObjectId mChannelId;
    private String mData;

    public ObjectId getChannelId() {
        return mChannelId;
    }

    public void setChannelId(ObjectId channelId) {
        mChannelId = channelId;
    }

    public String getData() {
        return mData;
    }

    public void setData(String data) {
        mData = data;
    }

    public String toJson() {
        JSONObject json = new JSONObject();
        json.put("channelId", mChannelId.toHexString());
        json.put("data", mData);
        return json.toString();
    }

    public static Parserable fromJson(String json) {

        if (json == null || json.length() == 0) {
            throw new IllegalArgumentException("JSON input cannot be null or empty");
        }
        Parserable parserable = new Parserable();
        JSONObject jsonObject = new JSONObject(json);
        parserable.setChannelId(new ObjectId(jsonObject.getString("channelId")));
        parserable.setData(jsonObject.getString("data"));
        return parserable;
    }
}
