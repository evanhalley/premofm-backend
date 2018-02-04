package com.mainmethod.premo.util.object;

/**
 * Created by evan on 8/7/15.
 */
public enum Status {
    IDLE(0),
    PROCESSING(1),
    ERROR(2),
    INACTIVE(3);

    private final int mId;

    Status(int id) {
        mId = id;
    }

    public int getId() {
        return mId;
    }

    static Status getStatus(int id) {

        switch (id) {
            case 0:
                return IDLE;
            case 1:
                return PROCESSING;
            case 2:
                return ERROR;
            case 3:
                return INACTIVE;
            default:
                throw new IllegalArgumentException(
                        String.format("Invalid status ID encountered: %d", id));
        }
    }
}