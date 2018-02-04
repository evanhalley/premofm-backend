package com.mainmethod.podcastcrawler.object;

import com.mainmethod.premo.util.string.StringHelper;

import java.util.List;

/**
 * Created by evan on 5/11/15.
 */
public class CrawledChannel {

    private long mITunesId;
    private String mAuthor;
    private String mTitle;
    private String mFeedUrl;
    private String mFeedUrlMd5;
    private List<String> mGenres;
    private String mArtworkUrl;

    public String getArtworkUrl() {
        return mArtworkUrl;
    }

    public void setArtworkUrl(String artworkUrl) {
        mArtworkUrl = artworkUrl;
    }

    public String getAuthor() {
        return mAuthor;
    }

    public void setAuthor(String author) {
        mAuthor = author;
    }

    public String getTitle() {
        return mTitle;
    }

    public void setTitle(String title) {
        mTitle = title;
    }

    public String getFeedUrl() {
        return mFeedUrl;
    }

    public String getFeedUrlMd5() {
        return mFeedUrlMd5;
    }

    public void setFeedUrl(String feedUrl) throws Exception {
        mFeedUrl = feedUrl;
        mFeedUrlMd5 = StringHelper.generateMD5(feedUrl.trim().toLowerCase());
    }

    public List<String> getGenres() {
        return mGenres;
    }

    public void setGenres(List<String> genres) {
        mGenres = genres;
    }

    public long getITunesId() {
        return mITunesId;
    }

    public void setITunesId(long ITunesId) {
        mITunesId = ITunesId;
    }

    @Override
    public String toString() {
        return "ITunesChannel{" +
                "mArtworkUrl='" + mArtworkUrl + '\'' +
                ", mITunesId=" + mITunesId +
                ", mAuthor='" + mAuthor + '\'' +
                ", mTitle='" + mTitle + '\'' +
                ", mFeedUrl='" + mFeedUrl + '\'' +
                ", mGenres=" + mGenres +
                '}';
    }
}
