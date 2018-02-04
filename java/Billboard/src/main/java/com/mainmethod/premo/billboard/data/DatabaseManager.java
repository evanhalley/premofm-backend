package com.mainmethod.premo.billboard.data;

import com.mainmethod.premo.billboard.Score;
import com.mainmethod.premo.util.date.DateParser;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.BaseDatabaseManager;
import com.mainmethod.premo.util.object.ActionType;
import com.mainmethod.premo.util.object.Category;
import com.mainmethod.premo.util.resource.ResourceUtility;
import com.mongodb.MongoClient;
import com.mongodb.MongoClientURI;
import com.mongodb.bulk.BulkWriteResult;
import com.mongodb.client.AggregateIterable;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.UpdateOneModel;
import com.mongodb.client.result.UpdateResult;
import org.apache.log4j.Logger;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;

import java.net.UnknownHostException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.exists;

/**
 * Manages interaction with the database
 * Created by evan on 6/9/15.
 */
public class DatabaseManager extends BaseDatabaseManager {

    private static final Logger sLogger = Logger.getLogger(DatabaseManager.class.getSimpleName());

    private MongoClient mCatalogClient;
    private MongoClient mPerformanceClient;

    public DatabaseManager() throws UnknownHostException {
        super(ContextManager.getInstance().getProperties());
    }

    @Override
    protected MongoClientURI getConnectionUri() {
        // we overrode init(), so this is unused
        return null;
    }

    @Override
    protected void init() throws UnknownHostException {
        sLogger.debug("Initializing MongoDB Client");

        // create the mongo client
        mCatalogClient = new MongoClient(new MongoClientURI(mProperties.getProperty("CATALOG_CONNECTION_URI")));
        mPerformanceClient = new MongoClient(new MongoClientURI(mProperties.getProperty("PERFORMANCE_CONNECTION_URI")));
    }

    @Override
    public void destroy() {

    }

    /**
     * Erases the billboard.trendingRank field
     */
    public void resetTrendingRankBillboard(PerformanceType performanceType) {
        sLogger.debug("Resetting trending billboards");
        MongoDatabase database = mCatalogClient.getDatabase(CATALOG_DB);
        MongoCollection<Document> collection = database.getCollection(performanceType.getCollectionName());
        Bson query = exists("billboard.trendingRank", true);
        Document update = new Document("$unset", new Document("billboard.trendingRank", ""));
        UpdateResult result = collection.updateMany(query, update);
        sLogger.debug("Records updated:" + result.getModifiedCount());
    }

    private void updateBillboard(List<Score> scores, String collectionName) {

        if (scores.size() == 0) {
            sLogger.info("0 scores");
            return;
        }

        sLogger.debug("Updating trending scores in the database");
        MongoDatabase database = mCatalogClient.getDatabase(CATALOG_DB);
        MongoCollection<Document> collection = database.getCollection(collectionName);
        List<UpdateOneModel<Document>> updates = new ArrayList<>();

        for (int i = 0; i < scores.size(); i++) {
            Bson query = eq("_id", new ObjectId(scores.get(i).getId()));
            Document update = new Document("$set", new Document("billboard.trendingRank", i + 1));
            updates.add(new UpdateOneModel<>(query, update));
        }
        BulkWriteResult result = collection.bulkWrite(updates);
        sLogger.debug(String.format("Records updated: %d", result.getModifiedCount()));
    }

    /**
     * Updates the channels document with trending scores
     * @param scores
     */
    public void updateChannelTrendingBillboard(List<Score> scores){
        updateBillboard(scores, "channel");
    }

    /**
     * Updates the channels document with trending scores
     * @param scores
     */
    public void updateEpisodeTrendingBillboard(List<Score> scores){
        updateBillboard(scores, "episode");
    }

    public Set<Score> getChannelsBySubscribers(Category category) {
        Set<Score> scores = new HashSet<>();
        int limitVal = Integer.parseInt(ContextManager.getInstance()
                .getProperty("NUMBER_OF_CHANNELS_TO_RANK"));
        Document query = new Document("information.category",
                new Document("$in", new Category[] { category }));
        Document projection = new Document("_id", 1).append("metrics.subscribers", 1);
        Document sort = new Document("metrics.subscribers", -1);

        MongoCursor<Document> cursor = null;
        MongoDatabase database = mCatalogClient.getDatabase(CATALOG_DB);
        MongoCollection<Document> collection = database.getCollection("channel");

        try {
            cursor = collection.find(query).projection(projection).limit(limitVal).sort(sort).iterator();

            while (cursor.hasNext()) {
                Document document = cursor.next();
                scores.add(new Score(document.getObjectId("_id").toHexString(),
                        ((Document) document.get("metrics")).getInteger("subscribers")));
            }
        } finally {
            ResourceUtility.closeResource(cursor);
        }
        return scores;
    }

    public HashSet<Score> getPerformanceRankedByActionType(ActionType actionType, PerformanceType performanceType) {
        HashSet<Score> scores = new HashSet<>();

        LocalDateTime localDateTime = LocalDateTime.now(ZoneId.of("GMT"))
                .minusDays(Integer.parseInt(ContextManager.getInstance()
                        .getProperty("AGGREGATION_DAY_RANGE")));
        Date date = DateParser.convertLocalDateTimeToDate(localDateTime);
        int limitVal = Integer.parseInt(ContextManager.getInstance()
                .getProperty("NUMBER_OF_CHANNELS_TO_RANK"));

        Document match = new Document("$match",
                new Document("actionType", actionType.getId())
                        .append("createdAt", new Document("$gte", date)));
        Document group = new Document("$group",
                new Document("_id", "$" + performanceType.getIdFieldName())
                        .append("count", new Document("$sum", 1)));
        Document limit = new Document("$limit", limitVal);
        Document sort = new Document("$sort",
                new Document("count", -1));
        Document[] pipeline = new Document[] { match, group, limit, sort };
        MongoCursor<Document> cursor = null;
        MongoDatabase database = mPerformanceClient.getDatabase(PERFORMANCE_DB);
        MongoCollection<Document> collection = database.getCollection("action");

        try {
            AggregateIterable<Document> results = collection.aggregate(Arrays.asList(pipeline));
            cursor = results.iterator();

            while (cursor.hasNext()) {
                Document document = cursor.next();
                scores.add(new Score(document.getObjectId("_id").toHexString(),
                        document.getInteger("count")));
            }
            sLogger.debug(String.format("Number of scores returned: %d", scores.size()));
        } finally {
            ResourceUtility.closeResource(cursor);
        }
        return scores;
    }
}