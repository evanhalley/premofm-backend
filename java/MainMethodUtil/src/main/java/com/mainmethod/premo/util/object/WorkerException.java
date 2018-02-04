package com.mainmethod.premo.util.object;

import org.bson.Document;
import org.bson.types.ObjectId;

/**
 * Created by evan on 11/16/14.
 */
public class WorkerException extends RuntimeException {

    public enum ExceptionType {
        ERROR_CANNOT_PARSE,
        ERROR_CONNECTION_FAILED,
        ERROR_CONTENT_NOT_XML,
        ERROR_DATABASE,
        ERROR_OTHER
    }

    private ObjectId mChannelId;
    private ExceptionType mExceptionType;
    private String mDetail;

    public WorkerException(ObjectId channelId, ExceptionType exceptionType, String detail) {
        mChannelId = channelId;
        mExceptionType = exceptionType;
        mDetail = detail;
    }

    public ExceptionType getExceptionType() {
        return mExceptionType;
    }

    public String getDetail() {
        return mDetail;
    }

    @Override
    public String toString() {
        return "WorkerException{" +
                "mExceptionType=" + mExceptionType +
                ", mDetail='" + mDetail + '\'' +
                '}';
    }

    public String toJson() {
        return toDocument().toJson();
    }

    public static WorkerException fromJson(String json) {

        if (json == null || json.length() == 0) {
            throw new IllegalArgumentException("JSON input cannot be null or empty");
        }
        return fromDocument(Document.parse(json));
    }

    public Document toDocument() {
        Document document = new Document();
        document.put("channelId", mChannelId);
        document.put("exceptionType", mExceptionType.name());
        document.put("detail", mDetail);
        return document;
    }

    public static WorkerException fromDocument(Document document) {
        WorkerException exception = new WorkerException(
                document.getObjectId("channelId"),
                ExceptionType.valueOf(document.getString("exceptionType")),
                document.getString("detail")
        );
        return exception;
    }
}