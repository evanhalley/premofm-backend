package com.mainmethod.premo.notifier.push;

import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.http.HttpUtility;
import com.mainmethod.premo.util.object.PushResponse;
import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.*;

/**
 * Created by evan on 11/11/14.
 */
public class GoogleCloudMessenger implements CloudMessenger {

    private static final Logger sLogger = Logger.getLogger(GoogleCloudMessenger.class.getSimpleName());

    // possible GCM response codes
    private static final int GCM_MESSAGE_SENT = 200;
    private static final int GCM_JSON_NO_PARSE = 400;
    private static final int GCM_AUTH_ERROR = 401;
    private static final int GCM_INT_SRV_ERROR_MIN = 500;
    private static final int GCM_INT_SRV_ERROR_MAX = 599;
    private static final int MAX_RECIPIENTS = 1_000;

    private final RedisManager mRedisManager;
    private final HttpUtility mHttpUtility;

    public GoogleCloudMessenger(RedisManager redisManager, HttpUtility httpUtility) {
        mRedisManager = redisManager;
        mHttpUtility = httpUtility;
    }

    @Override
    public StatusCode send(String[] recipientIds, JSONObject data) {
        return send(recipientIds, data, null);
    }

    @Override
    public StatusCode send(String[] recipientIds, JSONObject data, Map<String, String> options) {
        StatusCode statusCode = null;

        if(recipientIds != null && recipientIds.length > 0 && data != null && data.length() > 0) {
            sLogger.debug("Sending message to " + recipientIds.length + " recipients");

            // we can only send 1,000 recipients at a time, break it up into groups of 1,000
            int numberOfGroups = (recipientIds.length / MAX_RECIPIENTS) + 1;

            for (int i = 0; i < numberOfGroups; i++) {
                String[] recipientIdGroup;

                // the remaining group
                if ((i + 1) == numberOfGroups) {
                    int remainder = recipientIds.length % MAX_RECIPIENTS;
                    recipientIdGroup = Arrays.copyOfRange(recipientIds, i * MAX_RECIPIENTS,
                            i * MAX_RECIPIENTS + remainder);
                } else {
                    recipientIdGroup = Arrays.copyOfRange(recipientIds, i * MAX_RECIPIENTS,
                            i * MAX_RECIPIENTS + MAX_RECIPIENTS);
                }
                boolean result = sendRecipientGroup(recipientIdGroup, data, options);

                // all good
                if (result && (statusCode == null || statusCode == StatusCode.SUCCESSFUL)) {
                    statusCode = StatusCode.SUCCESSFUL;
                }

                // we've had failures before
                else if (result) {
                    statusCode = StatusCode.SUCCESSFUL_WITH_PROBLEM;
                } else if (!result && statusCode == StatusCode.SUCCESSFUL) {
                    statusCode = StatusCode.SUCCESSFUL_WITH_PROBLEM;
                }

                else {
                    statusCode = StatusCode.FAILURE;
                }
            }
        }
        return statusCode;
    }

    private boolean sendRecipientGroup(String[] recipientIds, JSONObject data, Map<String, String> options) {
        boolean messageSent = false;
        ContextManager ctxMgr = ContextManager.getInstance();

        // retrieve the url and API key
        String url = ctxMgr.getProperty("GCM_SERVER_URL");
        String apiKey = ctxMgr.getProperty("GCM_API_KEY");

        // build the payload
        JSONObject payload = new JSONObject();
        payload.put("registration_ids", recipientIds);
        payload.put("data", data);

        if (options != null) {
            sLogger.debug("Adding " + options.size() + " options to the message");

            for (String key : options.keySet()) {
                payload.put(key, options.get(key));
            }
        }

        try {
            // setup the header fields
            HashMap<String, String> headerFields = new HashMap<>();
            headerFields.put("Content-Type", "application/json");
            headerFields.put("Authorization", "key=" + apiKey);

            // send the gcm message
            int retryCount = 0;
            int maxRetries = Integer.parseInt(ctxMgr.getProperty("MAX_RETRIES"));
            long sleepTime = Long.parseLong(ctxMgr.getProperty("SLEEP_INTERVAL"));
            boolean retry;

            do {

                if (retryCount > 0) {
                    sleepTime = retryCount == 1 ? sleepTime : sleepTime * 2;
                    sLogger.debug("Retry " + retryCount + " of " + maxRetries +
                            " message send to Google, sleeping for " + sleepTime + " milliseconds");
                    Thread.sleep(sleepTime);
                }

                if (retryCount++ <= maxRetries) {
                    sLogger.info("Attempt number " + retryCount);
                    String payloadStr = payload.toString();
                    HttpUtility.Response response = mHttpUtility.sendPostData(url, payloadStr, headerFields);
                    sLogger.debug("Response code: " + response.getResponseCode());
                    sLogger.debug("Number of headers: " + response.getHeaderFields().size());

                    if (response.getResponseCode() == GCM_MESSAGE_SENT) {
                        List<PushResponse> responses = processResponse(response.getResponseBody(), recipientIds);
                        List<PushResponse> responsesToResend = getPushResponses(responses, PushResponse.Status.RESEND);
                        queueRegistrationIdsForDelete(responses);

                        if (responsesToResend.size() > 0) {
                            sLogger.info("Resending message to " + responsesToResend.size() + " ids ");
                            retry = true;
                            // rebuild the payload with the new IDs
                            payload = new JSONObject();
                            String[] registrationIds = new String[responsesToResend.size()];

                            for (int i = 0; i < responsesToResend.size(); i++) {
                                registrationIds[i] = responsesToResend.get(i).getRegistrationId();
                            }
                            payload.put("registrationIds", registrationIds);
                            payload.put("data", data);
                        } else {
                            messageSent = true;
                            retry = false;
                        }
                    } else if (response.getResponseCode() == GCM_JSON_NO_PARSE) {
                        sLogger.error("Unable to parse sent JSON: " + payloadStr);
                        retry = false;
                    } else if (response.getResponseCode() == GCM_AUTH_ERROR) {
                        sLogger.error("Authentication Error");
                        retry = false;
                    } else if (response.getResponseCode() >= GCM_INT_SRV_ERROR_MIN &&
                            response.getResponseCode() <= GCM_INT_SRV_ERROR_MAX) {
                        sLogger.error(String.format("Internal Server Error: %s", response.getResponseCode()));
                        retry = true;
                    } else {
                        sLogger.warn("Unknown HTTP response encountered: " + response.getResponseCode());
                        retry = false;
                    }
                } else {
                    retry = false;
                }
            } while (retry);
        } catch (JSONException e) {
            sLogger.error("Error processing JSON during GCM send", e);
        } catch (InterruptedException e) {
            sLogger.error("Error occurred while putting the thread to sleep", e);
        }
        return messageSent;
    }

    /**
     * Processes the response from GCM
     * @param responseStr
     * @param registrationIds
     * @return
     * @throws JSONException
     */
    private List<PushResponse> processResponse(String responseStr, String[] registrationIds) throws JSONException {
        // reference: http://developer.android.com/google/gcm/http.html#success
        List<PushResponse> pushResponses = new ArrayList<>(registrationIds.length);
        JSONObject response = new JSONObject(responseStr);
        sLogger.debug("Processing message: " + response.getLong("multicast_id"));
        sLogger.debug("Response String: " + response.toString(4));

        if(response.getInt("failure") > 0 || response.getInt("canonical_ids") > 0) {
            JSONArray results = response.getJSONArray("results");

            for(int i = 0; i < results.length(); i++) {
                JSONObject result = results.getJSONObject(i);

                if(!result.isNull("message_id") && !result.isNull("registration_id")) {
                    // TODO need to replace the registration id
                } else if(!result.isNull("error")) {
                    String error = result.getString("error");
                    sLogger.error("GCM Error: " + error);

                    if(error.contentEquals("Unavailable")) {
                        sLogger.warn("Received an unavailable, message should be resent to: " + registrationIds[i]);
                        pushResponses.add(new PushResponse(registrationIds[i], PushResponse.Status.RESEND,
                                PushResponse.Platform.GOOGLE, error));
                    }

                    // the device isn't registered anymore, let's delete it from the database
                    else if(error.contentEquals("NotRegistered")) {
                        sLogger.debug("Received device is not registered: " + registrationIds[i]);
                        pushResponses.add(new PushResponse(registrationIds[i], PushResponse.Status.NOT_REGISTERED,
                                PushResponse.Platform.GOOGLE, error));
                    }

                    else if(error.contentEquals("InternalServerError")) {
                        sLogger.warn("Received an internal server error, message should be resent to: " +
                                registrationIds[i]);
                        pushResponses.add(new PushResponse(registrationIds[i], PushResponse.Status.RESEND,
                                PushResponse.Platform.GOOGLE, error));
                    }
                }
            }
        } else {
            sLogger.debug("Message sent, nothing to see here");
        }

        return pushResponses;
    }

    /**
     * Adds registration IDs to the correct redis queue for deletion
     * @param responses
     */
    private void queueRegistrationIdsForDelete(List<PushResponse> responses) {

        if (responses == null || responses.size() == 0) {
            return;
        }
        sLogger.debug("Registration IDs to delete: " + responses.size());
        List<PushResponse> idsToDelete = getPushResponses(responses, PushResponse.Status.NOT_REGISTERED);
        idsToDelete.stream().forEach((response) -> {
            mRedisManager.push(RedisManager.PUSH_REGISTRATION_DELETE_LIST, response.toJson());
        });
    }

    /**
     * Returns a list of registration IDs by status
     * @param responses
     * @param status
     * @return
     */
    private static List<PushResponse> getPushResponses(List<PushResponse> responses, PushResponse.Status status) {

        if (responses == null) {
            return new ArrayList<>(0);
        }

        List<PushResponse> filteredResponses = new ArrayList<>(responses.size());

        responses.stream().forEach((response) -> {

            if (response.getSendStatus() == status) {
                filteredResponses.add(response);
            }
        });
        return filteredResponses;
    }
}

