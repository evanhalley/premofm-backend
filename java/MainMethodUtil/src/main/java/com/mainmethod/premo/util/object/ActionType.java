package com.mainmethod.premo.util.object;

/**
 * Created by evan on 6/9/15.
 */
public enum ActionType {

    EPISODE_LISTEN(0),
    EPISODE_DOWNLOAD(1),
    EPISODE_FAVORITE(2),
    CHANNEL_SUBSCRIBE(3),
    CHANNEL_FAVORITE(4),
    COLLECTION_ADD(5);

    private int mId;

    ActionType(int id) {
        mId = id;
    }

    public int getId() {
        return mId;
    }

}
