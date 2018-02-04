package com.mainmethod.premo.util.resource;

import org.apache.log4j.Logger;
import redis.clients.jedis.Transaction;

import javax.xml.stream.XMLEventReader;
import javax.xml.stream.XMLStreamReader;
import java.io.Closeable;
import java.net.HttpURLConnection;
import java.sql.Connection;
import java.sql.PreparedStatement;

/**
 * Helper methods for resource management
 * @author evan
 *
 */
public class ResourceUtility {

    private static final Logger sLogger = Logger.getLogger(ResourceUtility.class.getSimpleName());

    public static void closeResources(Object[] resources) {

        if (resources == null) {
            return;
        }

        for (Object resource : resources) {
            closeResource(resource);
        }
    }

    public static void closeResource(Object resource) {

        if (resource == null) {
            return;
        }

        try {
            if (resource instanceof HttpURLConnection) {
                ((HttpURLConnection) resource).disconnect();
            } else if (resource instanceof Closeable) {
                ((Closeable) resource).close();
            } else if (resource instanceof Connection) {
                ((Connection) resource).close();
            } else if (resource instanceof PreparedStatement) {
                ((PreparedStatement) resource).close();
            } else if (resource instanceof XMLStreamReader) {
                ((XMLStreamReader) resource).close();
            } else if (resource instanceof Transaction) {
                ((Transaction) resource).discard();
            } else {
                throw new IllegalArgumentException(String.format("Unknown type encountered: %s",
                        resource.getClass().getSimpleName()));
            }
        } catch (Exception e) {
            sLogger.error("Error closing resources");
            sLogger.error(e.getMessage());
        }
    }
}