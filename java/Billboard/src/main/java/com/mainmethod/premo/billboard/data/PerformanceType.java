package com.mainmethod.premo.billboard.data;

/**
 * Created by evan on 10/11/15.
 */
public enum PerformanceType {

    CHANNEL("channelId", "channel"),
    EPISODE("episodeId", "episode"),
    COLLECTION("collectionId", "collection");

    private final String mCollectionName;
    private final String mIdFieldName;

    PerformanceType(String idFieldName, String collectionName) {
        mIdFieldName = idFieldName;
        mCollectionName = collectionName;
    }

    public String getIdFieldName() {
        return mIdFieldName;
    }

    public String getCollectionName() {
        return mCollectionName;
    }
}
