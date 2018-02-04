
package com.mainmethod.premo.util.object;

import org.bson.Document;
import org.bson.types.ObjectId;

import java.util.*;

/**
 * Represents a podcast channel
 * Created by evan on 10/29/14.
 */
public class Channel {

    private ObjectId mId;
    private long mITunesId;
    private String mTitle;
    private String mAuthor;
    private String mDescription;
    private Collection<String> mKeywords;
    private Collection<String> mCategories;
    private String mSiteUrl;
    private String mFeedUrl;
    private String mFeedUrlMd5;
    private String mArtworkUrl;
    private PodcastType mPodcastType = PodcastType.UNKNOWN;

    // stores existing episodes
    private final Set<Episode> mExistingEpisodes;

    // stores existing episodes, the key is the media url
    private final Set<String> mExistingEpisodeGuids;

    // stores episodes to insert into the DB under this channel
    private final Set<Episode> mNewEpisodes;

    private final Set<String> mNewEpisodeGuids;

    public Channel() {
        mExistingEpisodes = new HashSet<>();
        mExistingEpisodeGuids = new HashSet<>();
        mNewEpisodes = new HashSet<>();
        mNewEpisodeGuids = new HashSet<>();
    }

    /**
     * Looks for the episode in the channel's episode maps
     *
     * @param episode
     * @return
     */
    public boolean doesEpisodeExist(Episode episode) {
        return mExistingEpisodes.contains(episode) ||
                mExistingEpisodeGuids.contains(episode.getGuid()) ||
                mNewEpisodes.contains(episode) ||
                mNewEpisodeGuids.contains(episode.getGuid());
    }

    public void addExistingEpisodes(List<Episode> episodes) {

        episodes.forEach((episode) -> {
            mExistingEpisodes.add(episode);
            mExistingEpisodeGuids.add(episode.getGuid());
        });
    }

    public void clearExistingEpisodes() {
        mExistingEpisodes.clear();
        mExistingEpisodeGuids.clear();
    }

    public void addNewEpisode(Episode episode) {
        mNewEpisodeGuids.add(episode.getGuid());
        mNewEpisodes.add(episode);
    }

    public Set<Episode> getNewEpisodes() {
        return mNewEpisodes;
    }

    public Set<Episode> getExistingEpisodes() {
        return mExistingEpisodes;
    }

    public ObjectId getId() {
        return mId;
    }

    public void setId(ObjectId id) {
        mId = id;
    }

    public long getITunesId() {
        return mITunesId;
    }

    public void setITunesId(long iTunesId) {
        this.mITunesId = iTunesId;
    }

    public String getTitle() {
        return mTitle;
    }

    public void setTitle(String title) {
        mTitle = title;
    }

    public String getAuthor() {
        return mAuthor;
    }

    public void setAuthor(String author) {
        mAuthor = author;
    }

    public String getDescription() {
        return mDescription;
    }

    public void setDescription(String description) {
        mDescription = description;
    }

    public Collection<String> getKeywords() {
        return mKeywords;
    }

    public void setKeywords(Collection<String> keywords) {
        mKeywords = new HashSet<>(keywords);
    }

    public void setKeywords(String keywords) {

        if (keywords == null) {
            return;
        }
        mKeywords = new HashSet<>();
        String[] keywordArr = keywords.split(",");
        Collections.addAll(mKeywords, keywordArr);
        // trim the whitespace around keywords
        mKeywords.forEach((keyword) -> keyword = keyword.trim());
    }

    public Collection<String> getCategories() {
        return mCategories;
    }

    public void setCategories(Collection<String> categories) {
        mCategories = new HashSet<>(categories);
    }

    public String getSiteUrl() {
        return mSiteUrl;
    }

    public void setSiteUrl(String siteUrl) {
        mSiteUrl = siteUrl;
    }

    public String getFeedUrl() {
        return mFeedUrl;
    }

    public void setFeedUrl(String feedUrl) {
        mFeedUrl = feedUrl;
    }

    public String getFeedUrlMd5() {
        return mFeedUrlMd5;
    }

    public void setFeedUrlMd5(String feedUrlMd5) {
        mFeedUrlMd5 = feedUrlMd5;
    }

    public String getArtworkUrl() {
        return mArtworkUrl;
    }

    public void setArtworkUrl(String artworkUrl) {
        mArtworkUrl = artworkUrl;
    }

    public PodcastType getPodcastType() {
        return mPodcastType;
    }

    public void setPodcastType(PodcastType podcastType) {
        mPodcastType = podcastType;
    }

    @Override
    public String toString() {
        return "Channel{" +
                "mId=" + mId +
                ", mTitle='" + mTitle + '\'' +
                ", mFeedUrl='" + mFeedUrl + '\'' +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        Channel channel = (Channel) o;

        if (mArtworkUrl != null ? !mArtworkUrl.equals(channel.mArtworkUrl) : channel.mArtworkUrl != null) return false;
        if (mAuthor != null ? !mAuthor.equals(channel.mAuthor) : channel.mAuthor != null) return false;
        if (mDescription != null ? !mDescription.equals(channel.mDescription) : channel.mDescription != null)
            return false;
        if (mKeywords.size() != channel.getKeywords().size())
            return false;
        if (mId != null ? !mId.equals(channel.mId) : channel.mId != null) return false;
        if (mSiteUrl != null ? !mSiteUrl.equals(channel.mSiteUrl) : channel.mSiteUrl != null) return false;
        if (!mTitle.equals(channel.mTitle)) return false;

        return true;
    }

    @Override
    public int hashCode() {
        return Objects.hash(mTitle, mAuthor, mDescription, mKeywords, mSiteUrl, mArtworkUrl);
    }

    public String toJson() {
        return toDocument().append("_id", mId).toJson();
    }

    public static Channel fromJson(String json) {

        if (json == null || json.length() == 0) {
            throw new IllegalArgumentException("JSON input cannot be null or empty");
        }
        return fromDocument(Document.parse(json));
    }

    public Document toDocument() {
        Document channelDoc = new Document();

        Document informationDoc = new Document();
        informationDoc.put("title", mTitle);
        informationDoc.put("feedUrl", mFeedUrl);
        informationDoc.put("description", mDescription);
        informationDoc.put("keywords", mKeywords);
        informationDoc.put("categories", mCategories);
        informationDoc.put("author", mAuthor);
        informationDoc.put("artworkUrl", mArtworkUrl);
        informationDoc.put("siteUrl", mSiteUrl);
        informationDoc.put("feedUrl", mFeedUrl);
        informationDoc.put("type", mPodcastType.getId());
        channelDoc.put("information", informationDoc);

        Document crawlerDoc = new Document();

        if (mITunesId != -1) {
            crawlerDoc.put("feedUrlMd5", mFeedUrlMd5);
            crawlerDoc.put("iTunesId", mITunesId);
            channelDoc.put("crawler", crawlerDoc);
        }

        return channelDoc;
    }

    public static Channel fromDocument(Document document) {
        Channel channel = new Channel();
        channel.setId(document.getObjectId("_id"));

        /** Crawler Doc **/
        Document crawlerDoc = (Document) document.get("crawler");

        if (crawlerDoc != null && crawlerDoc.containsKey("iTunesId")) {
            channel.setITunesId(crawlerDoc.getLong("iTunesId"));
            channel.setFeedUrlMd5(crawlerDoc.getString("feedUrlMd5"));
        } else {
            channel.setITunesId(-1);
        }

        Document infoDoc = (Document) document.get("information");
        channel.setTitle(infoDoc.getString("title"));
        channel.setDescription(infoDoc.getString("description"));

        List keywordList = (List) infoDoc.get("keywords");
        List<String> keywords;

        if (keywordList != null) {
            keywords = new ArrayList<>(keywordList.size());
            keywordList.stream().forEach(object -> keywords.add((String) object));
        } else {
            keywords = new ArrayList<>(0);
        }

        List categoriesList = (List) infoDoc.get("categories");
        List<String> categories;

        if (categoriesList != null) {
            categories = new ArrayList<>(categoriesList.size());
            categoriesList.stream().forEach(object -> categories.add((String) object));
        } else {
            categories = new ArrayList<>(0);
        }
        channel.setKeywords(keywords);
        channel.setCategories(categories);
        channel.setAuthor(infoDoc.getString("author"));
        channel.setSiteUrl(infoDoc.getString("siteUrl"));
        channel.setFeedUrl(infoDoc.getString("feedUrl"));
        channel.setArtworkUrl(infoDoc.getString("artworkUrl"));
        channel.setPodcastType(PodcastType.getPodcastType(infoDoc.getInteger("type", -1)));
        return channel;
    }
}
