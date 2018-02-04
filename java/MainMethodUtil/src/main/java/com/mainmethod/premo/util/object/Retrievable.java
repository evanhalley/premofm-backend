package com.mainmethod.premo.util.object;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.json.JSONObject;

/**
 * Created by evan on 7/5/15.
 */
public class Retrievable {

    private ObjectId mChannelId;
    private String mChannelTitle;
    private String mFeedUrl;
    private long mHttpLastModified;
    private String mHttpETag;
    private String mDataMd5;
    private boolean mAutoUpdateInformation;
    private boolean mOverrideHttpCaching;

    public ObjectId getChannelId() {
        return mChannelId;
    }

    public void setChannelId(ObjectId channelId) {
        mChannelId = channelId;
    }

    public String getChannelTitle() {
        return mChannelTitle;
    }

    public void setChannelTitle(String channelTitle) {
        mChannelTitle = channelTitle;
    }

    public String getFeedUrl() {
        return mFeedUrl;
    }

    public void setFeedUrl(String feedUrl) {
        mFeedUrl = feedUrl;
    }

    public String getDataMd5() {
        return mDataMd5;
    }

    public void setDataMd5(String dataMd5) {
        mDataMd5 = dataMd5;
    }

    public boolean isAutoUpdateInformation() {
        return mAutoUpdateInformation;
    }

    public void setAutoUpdateInformation(boolean autoUpdateInformation) {
        mAutoUpdateInformation = autoUpdateInformation;
    }

    public String getHttpETag() {
        return mHttpETag;
    }

    public void setHttpETag(String httpETag) {
        mHttpETag = httpETag;
    }

    public long getHttpLastModified() {
        return mHttpLastModified;
    }

    public void setHttpLastModified(long httpLastModified) {
        mHttpLastModified = httpLastModified;
    }

    public boolean isOverrideHttpCaching() {
        return mOverrideHttpCaching;
    }

    public void setOverrideHttpCaching(boolean overrideHttpCaching) {
        mOverrideHttpCaching = overrideHttpCaching;
    }

    public String toJson() {
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("channelId", mChannelId.toHexString());
        jsonObject.put("channelTitle", mChannelTitle);
        jsonObject.put("feedUrl", mFeedUrl);
        jsonObject.put("httpLastModified", mHttpLastModified);
        jsonObject.put("httpETag", mHttpETag);
        jsonObject.put("dataMd5", mDataMd5);
        jsonObject.put("autoUpdateInformation", mAutoUpdateInformation);
        jsonObject.put("overrideHttpCaching", mOverrideHttpCaching);
        return jsonObject.toString();
    }

    public static Retrievable fromJson(String json) {

        if (json == null || json.length() == 0) {
            throw new IllegalArgumentException("JSON input cannot be null or empty");
        }
        Retrievable retrievable = new Retrievable();
        JSONObject jsonObject = new JSONObject(json);
        retrievable.setChannelId(new ObjectId(jsonObject.getString("channelId")));
        retrievable.setFeedUrl(jsonObject.getString("feedUrl"));
        retrievable.setChannelTitle(jsonObject.getString("channelTitle"));
        retrievable.setHttpLastModified(jsonObject.getLong("httpLastModified"));
        retrievable.setHttpETag(jsonObject.getString("httpETag"));
        retrievable.setDataMd5(jsonObject.getString("dataMd5"));
        retrievable.setAutoUpdateInformation(jsonObject.getBoolean("autoUpdateInformation"));
        retrievable.setOverrideHttpCaching(jsonObject.getBoolean("overrideHttpCaching"));
        return retrievable;
    }

    public Document toDocument() {
        Document document = new Document();
        document.put("httpETag", mHttpETag);
        document.put("dataMd5", mDataMd5);
        document.put("httpLastModified", mHttpLastModified);
        document.put("autoUpdateInformation", mAutoUpdateInformation);
        document.put("overrideHttpCaching", mOverrideHttpCaching);
        return document;
    }

    public static Retrievable fromDocument(Document document) {
        Retrievable retrievable = new Retrievable();
        retrievable.setChannelId(document.getObjectId("_id"));

        Document infoDoc = (Document) document.get("information");
        retrievable.setFeedUrl(infoDoc.getString("feedUrl"));
        retrievable.setChannelTitle(infoDoc.getString("title"));

        /** Retriever Doc **/
        Document retrieverDoc = (Document) document.get("retriever");

        /**
         * We need to do this for httpLastModified because if a -1 is stored, it's an Integer, else it's a Long
         * Don't want to throw ClassCastExceptions - soooooooo dumb on MongoDB driver's part
         */
        Long httpLastModified = -1L;
        Object val = retrieverDoc.get("httpLastModified");

        if (val instanceof Integer) {
            httpLastModified = new Long(String.valueOf(val.toString()));
        } if (val instanceof Long) {
            httpLastModified = (Long) val;
        }
        String httpETag = retrieverDoc.getString("httpETag");
        String dataMd5 = retrieverDoc.getString("dataMd5");

        retrievable.setHttpLastModified(httpLastModified);
        retrievable.setHttpETag(httpETag == null ? "" : httpETag);
        retrievable.setDataMd5(dataMd5 == null ? "" : dataMd5);
        retrievable.setAutoUpdateInformation(
                retrieverDoc.getBoolean("autoUpdateInformation", true));
        retrievable.setOverrideHttpCaching(
                retrieverDoc.getBoolean("overrideHttpCaching", false));
        return retrievable;
    }
}