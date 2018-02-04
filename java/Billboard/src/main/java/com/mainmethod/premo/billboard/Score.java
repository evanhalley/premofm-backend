package com.mainmethod.premo.billboard;

/**
 * Created by evan on 6/9/15.
 */
public class Score {

    private String mId;
    private float mScore;

    public Score(String id, float score) {
        mId = id;
        mScore = score;
    }

    public String getId() {
        return mId;
    }

    public void setId(String id) {
        mId = id;
    }

    public float getScore() {
        return mScore;
    }

    public void setScore(float score) {
        mScore = score;
    }
}
