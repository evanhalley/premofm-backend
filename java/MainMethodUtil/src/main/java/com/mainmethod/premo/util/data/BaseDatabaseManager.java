package com.mainmethod.premo.util.data;

import com.mainmethod.premo.util.object.Channel;
import com.mainmethod.premo.util.resource.ResourceUtility;
import com.mongodb.MongoClient;
import com.mongodb.MongoClientURI;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.result.DeleteResult;
import com.mongodb.client.result.UpdateResult;
import org.apache.log4j.Logger;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;

import java.net.UnknownHostException;
import java.util.Properties;

import static com.mongodb.client.model.Filters.eq;

/**
 * Created by evan on 12/27/14.
 */
public abstract class BaseDatabaseManager {

    private static final Logger sLogger = Logger.getLogger(BaseDatabaseManager.class.getSimpleName());

    protected final static String CATALOG_DB = "catalog";
    protected final static String QUEUE_DB = "queue";
    protected final static String USER_DB = "user";
    protected final static String PERFORMANCE_DB = "performance";

    protected MongoClient mMongoClient;
    protected final Properties mProperties;

    protected BaseDatabaseManager(Properties properties) throws UnknownHostException {
        mProperties = properties;
        init();
    }

    protected abstract MongoClientURI getConnectionUri();

    /**
     * Initializes the DatabaseManager instance
     * @throws Exception
     */
    protected void init() throws UnknownHostException {
        initMongoClient();
    }

    /**
     * Initializes the mongo client instance
     */
    private void initMongoClient() {
        sLogger.debug("Initializing MongoDB Client");

        // create the mongo client
        mMongoClient = new MongoClient(getConnectionUri());
    }

    /**
     * Tears down the connection to database and dissolves the instance
     */
    public void destroy() {
        sLogger.debug("Destroying database manager");
        ResourceUtility.closeResource(mMongoClient);
    }

    /**
     * Returns a reference to the database
     * @return
     */
    protected MongoDatabase getDatabase(String database) {
        MongoDatabase db = mMongoClient.getDatabase(database);
        return db;
    }

    /**
     * Returns a channel by ID
     * @return
     */
    public Channel getChannel(ObjectId id) {
        Channel channel = null;
        sLogger.debug("Getting channel: " + id.toString());
        MongoDatabase db = getDatabase(CATALOG_DB);
        MongoCollection<Document> col = db.getCollection("channel");
        Bson query = eq("_id", id);
        sLogger.debug("Query: " + query.toString());
        Document document = col.find(query).first();

        if (document != null) {
            channel = Channel.fromDocument(document);
        }
        return channel;
    }

    /**
     * Executes an update query
     * @param collection
     * @param query
     * @param update
     * @throws Exception
     */
    protected boolean update(String database, String collection, Bson query, Document update,
                             boolean multi) {
        MongoDatabase db = getDatabase(database);
        MongoCollection<Document> coll = db.getCollection(collection);
        UpdateResult result;

        if (multi) {
            result = coll.updateMany(query, update);
        } else {
            result = coll.updateOne(query, update);
        }
        sLogger.debug("Query: " + query.toString());
        sLogger.debug("Update: " + update.toString());
        sLogger.debug("Result: " + result.toString());
        return result.getModifiedCount() > 0;
    }

    /**
     * Executes an insert query
     * @param collection
     * @param document
     * @throws Exception
     */
    protected boolean insert(String database, String collection, Document document) {
        MongoDatabase db = getDatabase(database);
        MongoCollection<Document> coll = db.getCollection(collection);
        coll.insertOne(document);
        sLogger.debug("Document: " + document.toString());
        return true;
    }

    /**
     * Executes a database remove query
     * @param collection
     * @param query
     * @return
     */
    protected boolean remove(String database, String collection, Document query) {
        MongoDatabase db = getDatabase(database);
        MongoCollection<Document> coll = db.getCollection(collection);
        DeleteResult result = coll.deleteOne(query);
        sLogger.debug("Query: " + query.toString());
        sLogger.debug("Result: " + result.toString());
        return result.getDeletedCount() > 0;
    }

}
