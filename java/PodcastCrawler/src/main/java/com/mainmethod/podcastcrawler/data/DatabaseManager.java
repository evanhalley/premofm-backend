package com.mainmethod.podcastcrawler.data;

import com.mainmethod.podcastcrawler.object.CrawledChannel;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.BaseDatabaseManager;
import com.mainmethod.premo.util.object.Channel;
import com.mainmethod.premo.util.object.Status;
import com.mainmethod.premo.util.resource.ResourceUtility;
import com.mongodb.MongoClientURI;
import com.mongodb.bulk.BulkWriteResult;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.InsertOneModel;
import com.mongodb.client.model.UpdateOneModel;
import com.mongodb.client.model.WriteModel;
import org.apache.log4j.Logger;
import org.bson.Document;
import org.bson.conversions.Bson;

import java.net.UnknownHostException;
import java.util.*;

import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.or;

/**
 * Created by evan on 5/11/15.
 */
public class DatabaseManager extends BaseDatabaseManager {

    private static final Logger sLogger =
            Logger.getLogger(DatabaseManager.class.getSimpleName());

    private static final Document PROJECTION = new Document("crawler.feedUrlMd5", 1)
            .append("crawler.iTunesId", 1);

    public DatabaseManager() throws UnknownHostException {
        super(ContextManager.getInstance().getProperties());
    }

    @Override
    protected MongoClientURI getConnectionUri() {
        return new MongoClientURI(mProperties.getProperty("CONNECTION_URI"));
    }

    public int insertChannels(List<CrawledChannel> crawledChannels) {
        int capacity = Integer.parseInt(ContextManager.getInstance().getProperty("NUMBER_CHANNELS_TO_BULK_AT_ONCE"));
        List<WriteModel<Document>> recordsToWrite = new ArrayList<>(capacity);
        Set<String> feedUrlMd5s = new HashSet<>(capacity);

        crawledChannels.stream().forEach((crawledChannel) -> {

            try {
                Document channelDoc = getChannel(crawledChannel.getITunesId(), crawledChannel.getFeedUrlMd5());
                Date now = new Date();

                // case where channel doc doesn't exist
                if (channelDoc == null && !feedUrlMd5s.contains(crawledChannel.getFeedUrlMd5())) {
                    // convert channel data array into new object
                    Channel channel = createChannelObject(crawledChannel);

                    if (channel == null) {
                        return;
                    }

                    // convert to mongo db record
                    Document channelDocument = channel.toDocument();
                    channelDocument.put("createdAt", now);
                    channelDocument.put("retriever", new Document()
                            .append("httpLastModified", new Long(-1))
                            .append("httpETag", "")
                            .append("dataMd5", "")
                            .append("autoUpdateInformation", true)
                            .append("overrideHttpCaching", false)
                            .append("status", Status.IDLE.getId())
                            .append("processingStartedAt", null)
                            .append("processingFinishedAt", null));
                    channelDocument.put("metrics", new Document()
                            .append("subscribers", new Integer(0)));
                    ((Document) channelDocument.get("crawler")).put("crawledAt", now);
                    recordsToWrite.add(new InsertOneModel<>(channelDocument));
                    feedUrlMd5s.add(crawledChannel.getFeedUrlMd5());
                }

                // case where the channel exists, but the feed url is different
                else if (channelDoc != null && !crawledChannel.getFeedUrlMd5().contentEquals(channelDoc.getString("feedUrlMd5")) &&
                        !feedUrlMd5s.contains(crawledChannel.getFeedUrlMd5())) {
                    sLogger.debug(String.format("Channel with iTunes ID: %d needs a feed URL update to %s",
                            crawledChannel.getITunesId(), crawledChannel.getFeedUrl()));
                    recordsToWrite.add(new UpdateOneModel<>(eq("crawler.iTunesId", crawledChannel.getITunesId()),
                            new Document("$set", new Document("information.feedUrl", crawledChannel.getFeedUrl())
                                    .append("crawler.feedUrlMd5", crawledChannel.getFeedUrlMd5())
                                    .append("crawler.crawledAt", new Date()))));
                    feedUrlMd5s.add(crawledChannel.getFeedUrlMd5());
                }
            } catch (Exception e) {
                sLogger.warn(e);
            }
        });

        // insert channels
        if (recordsToWrite.size() > 0) {
            return bulkInsertChannels(recordsToWrite);
        } else {
            return 0;
        }
    }

    private int bulkInsertChannels(List<WriteModel<Document>> documents) {
        sLogger.debug(String.format("Number of documents to bulk insert: %d", documents.size()));
        MongoDatabase database = getDatabase(CATALOG_DB);
        MongoCollection<Document> collection = database.getCollection("channel");
        BulkWriteResult result = collection.bulkWrite(documents);
        return result.getInsertedCount() + result.getModifiedCount();
    }

    private Document getChannel(long iTunesId, String feedUrlMd5) throws Exception {
        Document document = null;
        MongoCursor<Document> cursor = null;
        MongoDatabase database = getDatabase(CATALOG_DB);
        MongoCollection<Document> collection = database.getCollection("channel");
        Bson query = or(eq("crawler.iTunesId", iTunesId), eq("crawler.feedUrlMd5", feedUrlMd5));

        try {
            cursor = collection.find(query).projection(PROJECTION).limit(2).iterator();

            if (cursor != null && cursor.hasNext()) {
                Document doc = cursor.next();

                if (cursor.hasNext()) {
                    // the case more than one episode is returned, probably because they share a feed url
                    throw new Exception(
                            String.format("Multiple channels returned for iTunesId: %d and Feed URL: %s",
                                    iTunesId, feedUrlMd5));
                }

                document = new Document();

                if (doc.containsKey("crawler")) {
                    document.append("iTunesId", ((Document) doc.get("crawler")).getLong("iTunesId"));
                    document.append("feedUrlMd5", ((Document) doc.get("crawler")).getString("feedUrlMd5"));
                }
            }
        } finally {
            ResourceUtility.closeResource(cursor);
        }


        return document;
    }

    /**
     * Creates a Premo channel object from an iTunes object
     * @param crawledChannel
     * @return
     */
    private Channel createChannelObject(CrawledChannel crawledChannel) {
        Channel channel = null;

        try {
            channel = new Channel();
            channel.setITunesId(crawledChannel.getITunesId());
            channel.setTitle(crawledChannel.getTitle());
            channel.setAuthor(crawledChannel.getAuthor());
            channel.setFeedUrl(crawledChannel.getFeedUrl());
            channel.setFeedUrlMd5(crawledChannel.getFeedUrlMd5());
            channel.setCategories(crawledChannel.getGenres());
            channel.setArtworkUrl(crawledChannel.getArtworkUrl());
        } catch (Exception e) {
            sLogger.error("Error creating channel object", e);
        }
        return channel;
    }
}