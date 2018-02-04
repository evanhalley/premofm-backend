package com.mainmethod.premo.util.object;

import org.bson.Document;
import org.bson.types.ObjectId;

import java.util.Date;
import java.util.Objects;

/**
 * Created by evan on 10/29/14.
 */
public class Episode  {

    protected ObjectId mId;
    protected ObjectId mChannelId;
    protected Date mCreatedAt;
    protected String mGuid;
    protected String mTitle;
    protected String mDescription;
    protected Date mPublishedAt;
    protected Date mUpdatedAt;
    protected long mDuration;
    protected String mUrl;
    protected String mMediaUrl;
    protected long mSize;
    protected String mMimeType;

    public Episode() {

    }

    @Override
    public int hashCode() {
        return Objects.hash(mGuid, mTitle, mMediaUrl, mUrl == null ? null : mUrl);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        Episode episode = (Episode) o;

        if (mDuration != episode.mDuration) return false;
        if (mSize != episode.mSize) return false;
        if (!mChannelId.equals(episode.mChannelId)) return false;
        if (!mGuid.equals(episode.mGuid)) return false;
        if (!mTitle.equals(episode.mTitle)) return false;
        if (mDescription != null ? !mDescription.equals(episode.mDescription) : episode.mDescription != null) return false;
        if (mUrl != null ? !mUrl.equals(episode.mUrl) : episode.mUrl != null) return false;
        if (!mMediaUrl.equals(episode.mMediaUrl)) return false;
        return mMimeType.equals(episode.mMimeType);

    }

    public ObjectId getId() {
        return mId;
    }

    public void setId(ObjectId id) {
        mId = id;
    }

    public ObjectId getChannelId() {
        return mChannelId;
    }

    public void setChannelId(ObjectId channelId) {
        mChannelId = channelId;
    }

    public Date getCreatedAt() {
        return mCreatedAt;
    }

    public void setCreatedAt(Date createdAt) {
        mCreatedAt = createdAt;
    }

    public String getGuid() {
        return mGuid;
    }

    public void setGuid(String guid) {
        mGuid = guid;
    }

    public String getTitle() {
        return mTitle;
    }

    public void setTitle(String title) {
        mTitle = title;
    }

    public String getDescription() {
        return mDescription;
    }

    public void setDescription(String description) {
        mDescription = description;
    }

    public Date getPublishedAt() {
        return mPublishedAt;
    }

    public void setPublishedAt(Date publishedAt) {
        mPublishedAt = publishedAt;
    }

    public Date getUpdatedAt() {
        return mUpdatedAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        mUpdatedAt = updatedAt;
    }

    public long getDuration() {
        return mDuration;
    }

    public void setDuration(long duration) {
        mDuration = duration;
    }

    public String getUrl() {
        return mUrl;
    }

    public void setUrl(String url) {
        mUrl = url;
    }

    public String getMediaUrl() {
        return mMediaUrl;
    }

    public void setMediaUrl(String mediaUrl) {
        mMediaUrl = mediaUrl;
    }

    public long getSize() {
        return mSize;
    }

    public void setSize(long size) {
        mSize = size;
    }

    public String getMimeType() {
        return mMimeType;
    }

    public void setMimeType(String mimeType) {
        mMimeType = mimeType;
    }

    @Override
    public String toString() {
        return "Episode{" +
                "mId=" + mId +
                ", mCreatedAt=" + mCreatedAt +
                ", mGuid='" + mGuid + '\'' +
                ", mTitle='" + mTitle + '\'' +
                ", mPublishedAt=" + mPublishedAt +
                ", mUpdatedAt=" + mUpdatedAt +
                ", mDuration='" + mDuration + '\'' +
                ", mUrl='" + mUrl + '\'' +
                ", mMediaUrl='" + mMediaUrl + '\'' +
                ", mSize=" + mSize +
                ", mMimeType='" + mMimeType + '\'' +
                '}';
    }

    public String toJson() {
        return toDocument().toJson();
    }

    public static Episode fromJson(String json) {

        if (json == null || json.length() == 0) {
            throw new IllegalArgumentException("JSON input cannot be null or empty");
        }
        return fromDocument(Document.parse(json));
    }

    /**
     * Converts an Episode to a Mongo document
     * @return
     */
    public Document toDocument() {
        Document document = new Document();
        Document infoDoc = new Document();
        infoDoc.put("title", mTitle);
        infoDoc.put("description", mDescription);
        infoDoc.put("duration", mDuration);
        infoDoc.put("guid", mGuid);
        infoDoc.put("url", mUrl);
        infoDoc.put("mediaUrl", mMediaUrl);
        infoDoc.put("size", mSize);
        infoDoc.put("mimeType", mMimeType);
        infoDoc.put("publishedAt", mPublishedAt);
        infoDoc.put("updatedAt", mUpdatedAt);
        document.put("information", infoDoc);
        document.put("createdAt", mCreatedAt);
        document.put("channelId", mChannelId);

        return document;
    }

    /**
     * Converts a Mongo document to an Episode object
     * @param document
     * @return
     */
    public static Episode fromDocument(Document document) {
        Episode episode = new Episode();
        Document infoDoc = (Document) document.get("information");
        episode.setChannelId(document.getObjectId("channelId"));
        episode.setCreatedAt(document.getDate("createdAt"));

        episode.setTitle(infoDoc.getString("title"));
        episode.setDescription(infoDoc.getString("description"));
        episode.setDuration(infoDoc.getLong("duration"));
        episode.setGuid(infoDoc.getString("guid"));
        episode.setUrl(infoDoc.getString("url"));
        episode.setMediaUrl(infoDoc.getString("mediaUrl"));
        episode.setSize(infoDoc.getLong("size"));
        episode.setMimeType(infoDoc.getString("mimeType"));
        episode.setPublishedAt(infoDoc.getDate("publishedAt"));
        episode.setUpdatedAt(infoDoc.getDate("updatedAt"));
        return episode;
    }
}
