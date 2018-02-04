package com.mainmethod.premo.util.object;

import org.json.JSONObject;

/**
 * Represents a push response
 * Created by evan on 9/6/15.
 */
public class PushResponse {

    public enum Status {
        SENT,
        RESEND,
        NOT_REGISTERED
    }

    public enum Platform {
        GOOGLE
    }

    private final String mRegistrationId;
    private final Status mSendStatus;
    private final Platform mPlatform;
    private final String mError;

    public PushResponse(String registrationId, Status sendStatus, Platform platform, String error) {
        mRegistrationId = registrationId;
        mSendStatus = sendStatus;
        mPlatform = platform;
        mError = error;
    }

    public String getError() {
        return mError;
    }

    public Platform getPlatform() {
        return mPlatform;
    }

    public String getRegistrationId() {
        return mRegistrationId;
    }

    public Status getSendStatus() {
        return mSendStatus;
    }

    public String toJson() {
        JSONObject json = new JSONObject();
        json.put("registrationId", mRegistrationId);
        json.put("status", mSendStatus.name());
        json.put("platform", mPlatform.name());
        json.put("error", mError);
        return json.toString();
    }

    public static PushResponse fromJson(String json) {

        if (json == null || json.length() == 0) {
            throw new IllegalArgumentException("JSON input cannot be null or empty");
        }
        JSONObject jsonObject = new JSONObject(json);
        return new PushResponse(jsonObject.getString("registrationId"),
                Status.valueOf(jsonObject.getString("status")),
                Platform.valueOf(jsonObject.getString("platform")),
                jsonObject.getString("error"));
    }
}
