package com.mainmethod.premo.notifier.push;

import org.json.JSONObject;

import java.util.Map;

/**
 * Interface for a cloud push service
 * Created by evan on 11/11/14.
 */
public interface CloudMessenger {

    enum StatusCode {
        SUCCESSFUL,
        SUCCESSFUL_WITH_PROBLEM,
        FAILURE
    }

    StatusCode send(String[] recipientIds, JSONObject data);
    StatusCode send(String[] recipientIds, JSONObject data, Map<String, String> options);

}
