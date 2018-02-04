package com.mainmethod.premo.retriever.data;

import com.mainmethod.premo.util.date.DateParser;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.BaseDatabaseManager;
import com.mainmethod.premo.util.object.Channel;
import com.mainmethod.premo.util.object.Retrievable;
import com.mainmethod.premo.util.object.Status;
import com.mainmethod.premo.util.resource.ResourceUtility;
import com.mongodb.MongoClientURI;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import org.apache.log4j.Logger;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;

import java.net.UnknownHostException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import static com.mongodb.client.model.Filters.*;

/**
 * Manages the information exchange with the database
 * Created by evan on 10/29/14.
 */
public class DatabaseManager extends BaseDatabaseManager {

    private static final Logger sLogger = Logger.getLogger(DatabaseManager.class.getSimpleName());

    public DatabaseManager() throws UnknownHostException {
        super(ContextManager.getInstance().getProperties());
    }

    @Override
    protected MongoClientURI getConnectionUri() {
        return new MongoClientURI(mProperties.getProperty("CONNECTION_URI"));
    }

    public int getTotalNumberOfChannels() {
        MongoDatabase database = getDatabase(CATALOG_DB);
        MongoCollection<Document> collection = database.getCollection("channel");
        return (int) collection.count();
    }

    /**
     * Returns a list of channels to process
     * @return list of channels ready for processing
     */
    public List<Retrievable> getChannelsToProcess(int limit) {
        sLogger.debug("Getting channels to process");

        // get channels to process
        List<Retrievable> channelList = getIdleChannels(limit);

        return channelList;
    }

    /**
     * Returns a list of channels not currently being processed
     * @return
     */
    private List<Retrievable> getIdleChannels(int max) {
        sLogger.debug("Getting channels that are not processing");
        List<Retrievable> channelList = new ArrayList<>(max);

        if (max < 1) {
            return channelList;
        }
        // calculate what range of podcasts to retrieve
        //   example: 200 podcasts, range 0_15
        //   skip = 0 * 200 = 0
        //   limit = .15 * 200 = 30

        // 1) get the properties from the property file and split
        float start = Float.parseFloat(ContextManager.getInstance().getProperty("RETRIEVAL_RANGE_START"));
        float end = Float.parseFloat(ContextManager.getInstance().getProperty("RETRIEVAL_RANGE_END"));

        // 3) get total number of podcast channels
        int numberOfChannels = getTotalNumberOfChannels();

        // 4) calculate the limit and skip
        int skip = Math.round(start * numberOfChannels);
        int limit = Math.round(end * numberOfChannels);

        // Restrict the limit to be max
        if (limit > max) {
            limit = max;
        }

        MongoDatabase database = getDatabase(CATALOG_DB);
        MongoCursor<Document> cursor = null;
        MongoCollection<Document> collection = database.getCollection("channel");
        Document fields = new Document("information.title", true)
                .append("information.feedUrl", true)
                .append("retriever", true)
                .append("_id", true);

        // calculate date for query
        int updatedAtMinimum = Integer.parseInt(
                ContextManager.getInstance().getProperty("RETRIEVER_UPDATED_AT_MINIMUM"));
        LocalDateTime localDateTime = LocalDateTime.now(ZoneId.of("GMT")).minusSeconds(updatedAtMinimum);
        Date updatedAt = DateParser.convertLocalDateTimeToDate(localDateTime);

        Bson query = and(eq("retriever.status", Status.IDLE.getId()),
                or(lt("retriever.processingStartedAt", updatedAt), eq("retriever.processingStartedAt", null)));
        sLogger.debug(String.format("Retrieving channels that haven't been processed since: %s", updatedAt.toGMTString()));
        Document orderBy = new Document("metrics.subscribers", -1).append("retriever.processingStartedAt", 1);
        sLogger.debug("Query: " + query.toString());
        sLogger.debug("Order By: " + orderBy.toString());
        sLogger.debug("Fields: " + fields.toString());
        sLogger.debug("Limit: " + limit);
        sLogger.debug("Skip: " + skip);

        try {
            List<ObjectId> objectIds = new ArrayList<>(limit);
            cursor = collection.find(query).limit(limit).sort(orderBy).iterator();

            while (cursor.hasNext()) {
                Document document = cursor.next();
                Retrievable queuedChannel = Retrievable.fromDocument(document);
                channelList.add(queuedChannel);
                objectIds.add(queuedChannel.getChannelId());
            }
            sLogger.debug("Number of channels retrieved: " + channelList.size());

            if (objectIds.size() > 0) {
                markChannelsAsProcessing(objectIds);
            }
        } finally {
            ResourceUtility.closeResource(cursor);
        }
        return channelList;
    }

    /**
     * Marks the list of channels as processing
     * @param idList
     * @return
     */
    private boolean markChannelsAsProcessing(List<ObjectId> idList) {
        Date now = DateParser.now();
        Bson query = in("_id", idList);
        Document update = new Document("$set", new Document("retriever.status", Status.PROCESSING.getId())
                .append("retriever.processingStartedAt", now));
        return update(CATALOG_DB, "channel", query, update, true);
    }
}