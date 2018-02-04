package com.mainmethod.premo.parser.data;

import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.BaseDatabaseManager;
import com.mainmethod.premo.util.object.Episode;
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
import java.util.Date;
import java.util.List;

import static com.mongodb.client.model.Filters.eq;

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
     * Returns a list of episodes for a given channel
     */
    public List<Episode> getEpisodes(ObjectId channelId) {
        sLogger.debug("Getting episodes for channel: " + channelId.toString());
        List<Episode> episodeList = new ArrayList<>(512);
        MongoCursor<Document> cursor = null;

        MongoDatabase database = getDatabase(CATALOG_DB);
        MongoCollection<Document> collection = database.getCollection("episode");
        Bson query = eq("channelId", channelId);
        sLogger.debug("Query: " + query.toString());

        try {
            cursor = collection.find(query).iterator();
            long start = new Date().getTime();

            while (cursor.hasNext()) {
                episodeList.add(Episode.fromDocument(cursor.next()));
            }
            long end = new Date().getTime();
            sLogger.debug(String.format("getEpisodes processing time: %d ms", end - start));
        } finally {
            ResourceUtility.closeResource(cursor);
        }
        return episodeList;
    }
}
