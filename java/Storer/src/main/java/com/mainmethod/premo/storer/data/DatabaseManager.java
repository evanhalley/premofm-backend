package com.mainmethod.premo.storer.data;

import com.mainmethod.premo.util.date.DateParser;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.BaseDatabaseManager;
import com.mainmethod.premo.util.object.*;
import com.mongodb.MongoBulkWriteException;
import com.mongodb.MongoClientURI;
import com.mongodb.bulk.BulkWriteResult;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.BulkWriteOptions;
import com.mongodb.client.model.InsertOneModel;
import com.mongodb.client.model.UpdateOneModel;
import com.mongodb.client.model.WriteModel;
import org.apache.log4j.Logger;
import org.bson.Document;
import org.bson.conversions.Bson;

import java.net.UnknownHostException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;

import static com.mongodb.client.model.Filters.*;

/**
 * Created by evan on 12/27/14.
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


    /**
     * Bulks updates channel information sub documents
     * Returns the number of records updated
     * @param episode
     * @return
     */
    public InsertOneModel<Document> generateEpisodeInsertRecords(Episode episode) {
        return new InsertOneModel<>(episode.toDocument());
    }

    /**
     * Updates a podcast channel information
     * @param channel
     * @return
     */
    public UpdateOneModel<Document> generateChannelUpdateRecords(Channel channel) {
        Document update = new Document("$set", new Document("information.description", channel.getDescription())
            .append("information.keywords", channel.getKeywords())
            .append("information.author", channel.getAuthor())
            .append("information.siteUrl", channel.getSiteUrl())
                .append("information.type", channel.getPodcastType().getId()));
        Bson query = eq("_id", channel.getId());
        return new UpdateOneModel<>(query, update);
    }

    /**
     * Updates the channels retriever metadata sub document
     * @param retrieverMetadata
     * @return
     */
    public UpdateOneModel<Document> generateRetrievableUpdate(Retrievable retrieverMetadata) {
        Date now = DateParser.now();
        Document document = new Document("retriever.overrideHttpCaching", false)
                .append("retriever.httpLastModified", retrieverMetadata.getHttpLastModified())
                .append("retriever.httpETag", retrieverMetadata.getHttpETag())
                .append("retriever.dataMd5", retrieverMetadata.getDataMd5())
                .append("retriever.autoUpdateInformation", retrieverMetadata.isAutoUpdateInformation())
                .append("retriever.status", Status.IDLE.getId())
                .append("retriever.processingFinishedAt", now);
        Document update = new Document("$set", document);
        Bson query = eq("_id", retrieverMetadata.getChannelId());
        return new UpdateOneModel<>(query, update);
    }

    public int[] processBulkWrites(String collectionName, List<WriteModel<Document>> documents) {
        MongoDatabase database = getDatabase(collectionName.contentEquals("user") ? USER_DB : CATALOG_DB);
        MongoCollection<Document> collection = database.getCollection(collectionName);
        int[] results = new int[2];

        try {
            BulkWriteResult result = collection.bulkWrite(documents, new BulkWriteOptions().ordered(false));
            results[0] = result.getInsertedCount();
            results[1] = result.getModifiedCount();
        } catch (MongoBulkWriteException e) {
            sLogger.warn("MongoBulkWriteException encountered while storing channels", e);
        }
        return results;
    }

    /**
     * Marks records that have been status = PROCESSING for longer than X seconds
     * @return
     */
    public boolean updateProcessingRecords() {
        Date now = DateParser.now();

        // calculate date for query
        int processingDurationLimit = Integer.parseInt(
                ContextManager.getInstance().getProperty("IS_PROCESSING_DURATION_LIMIT"));
        LocalDateTime localDateTime = LocalDateTime.now(ZoneId.of("GMT")).minusSeconds(processingDurationLimit);
        Date updatedAt = DateParser.convertLocalDateTimeToDate(localDateTime);

        // update channels that are status = PROCESSING and have been processing for > X seconds
        Document update = new Document("$set", new Document("retriever.status", Status.IDLE.getId())
                .append("retriever.processingFinishedAt", now));
        Bson query = and(eq("retriever.status", Status.PROCESSING.getId()),
                gte("retriever.processingStartedAt", updatedAt));
        return update(CATALOG_DB, "channel", query, update, true);
    }

    /**
     * Inserts errors into the error collection
     * @param exception
     * @return
     */
    public InsertOneModel<Document> generateErrorInsert(WorkerException exception) {
        Document document = exception.toDocument();
        return new InsertOneModel<>(document);
    }

    /**
     * Returns an update query the removes registration IDs from user profiles
     * @param response
     * @return
     */
    public UpdateOneModel<Document> generateRegistrationIdDelete(PushResponse response) {
        Bson query = in("device.google", response.getRegistrationId());
        Document update = new Document("$pull", new Document("device.google", response.getRegistrationId()));
        return new UpdateOneModel<>(query, update);
    }
}
