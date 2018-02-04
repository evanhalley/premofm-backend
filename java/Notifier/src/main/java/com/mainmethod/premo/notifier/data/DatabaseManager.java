
package com.mainmethod.premo.notifier.data;

import com.mainmethod.premo.notifier.data.object.Device;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.BaseDatabaseManager;
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
import java.util.ArrayList;
import java.util.List;

import static com.mongodb.client.model.Filters.eq;

/**
 * Manages interaction with the database
 * Created by evan on 6/9/14.
 */
public class DatabaseManager extends BaseDatabaseManager {

    private static final Logger sLogger =
            Logger.getLogger(DatabaseManager.class.getSimpleName());

    public DatabaseManager() throws UnknownHostException{
        super(ContextManager.getInstance().getProperties());
    }

    @Override
    protected MongoClientURI getConnectionUri() {
        return new MongoClientURI(mProperties.getProperty("CONNECTION_URI"));
    }

    /**
     * Returns a list of users' devices subscribed to a collection with the collectionId
     * @param collectionId
     * @return
     */
    public List<Device> getCollectionSubscribedDevices(ObjectId collectionId) {
        Bson query = eq("collection.subscriptions", collectionId);
        Document fields = new Document("device", true).append("_id", false);
        return getDevices(query, fields, collectionId);
    }

    /**
     * Returns a list of users' devices subscribed to a channel with the channelId
     * @param channelId
     * @return list of devices
     */
    public List<Device> getChannelSubscribedDevices(ObjectId channelId) {
        Bson query = eq("channel.subscriptions", channelId);
        Document fields = new Document("device", true).append("_id", false);
        return getDevices(query, fields, channelId);
    }

    private List<Device> getDevices(Bson query, Document fields, ObjectId id) {
        sLogger.debug("Query: " + query.toString());
        sLogger.debug("Fields: " + fields.toString());
        List<Device> subscribedDevices = new ArrayList<>();
        MongoCursor<Document> cursor = null;
        MongoDatabase database = getDatabase(USER_DB);
        MongoCollection<Document> collection = database.getCollection("user");

        try {
            cursor = collection.find(query).projection(fields).iterator();

            while (cursor.hasNext()) {
                Document record = cursor.next();
                Document device = (Document) record.get("device");

                if (device != null) {
                    @SuppressWarnings("unchecked")
                    List<String> deviceIds = (List<String>) device.get("google");

                    if (deviceIds != null) {

                        for (int i = 0; i < deviceIds.size(); i++) {
                            subscribedDevices.add(new Device(id, deviceIds.get(i)));
                        }
                    }
                }
            }
        } finally {
            ResourceUtility.closeResource(cursor);
        }
        return subscribedDevices;
    }
}