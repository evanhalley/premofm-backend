package com.mainmethod.premo.util.object;

/**
 * Defines the podcast types
 * Created by evan on 8/7/15.
 */
public enum PodcastType {

    UNKNOWN(-1),
    AUDIO(0),
    VIDEO(1);

    private final int mId;

    PodcastType(int id) {
        mId = id;
    }

    public int getId() {
        return mId;
    }

    static PodcastType getPodcastType(int id) {

        switch (id) {
            case 0:
                return AUDIO;
            case 1:
                return VIDEO;
            default:
                return UNKNOWN;
        }
    }

}
