package com.mainmethod.premo.retriever.worker;

import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.http.HttpUtility;
import com.mainmethod.premo.util.object.Parserable;
import com.mainmethod.premo.util.object.Retrievable;
import com.mainmethod.premo.util.object.WorkerException;
import com.mainmethod.premo.util.resource.ResourceUtility;
import com.mainmethod.premo.util.string.StringHelper;
import org.apache.log4j.Logger;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.util.Date;
import java.util.zip.DeflaterInputStream;
import java.util.zip.GZIPInputStream;

/**
 * The channel worker retrieves data from a podcast feed url and stores it
 *
 * Created by evan on 11/7/14
 */
public class ChannelWorker implements Runnable {

    private static final Logger sLogger = Logger.getLogger(ChannelWorker.class.getSimpleName());
    private final Retrievable mRetrievable;
    private final RedisManager mRedisManager;
    private final int mBufferSize;

    public ChannelWorker(Retrievable retrievable, RedisManager redisManager) {
        mRetrievable = retrievable;
        mRedisManager = redisManager;
        mBufferSize = Integer.parseInt(ContextManager.getInstance().getProperty("HTTP_READ_BUFFER"));
    }

    @Override
    public void run() {
        sLogger.info("Channel retrieval starting: " + mRetrievable.getChannelTitle());
        Date startedProcessingAt = new Date();
        String channelData = null;
        WorkerException exception = null;

        try {
            /*** 1) Get the channel's XML data ***/
            channelData = getChannelData();

        } catch (WorkerException e) {
            sLogger.warn("WorkerException encountered");
            sLogger.warn(e.toString());
            exception = e;
        }

        // if we have an exception/error, write to error list
        if (exception != null) {
            mRedisManager.push(RedisManager.ERROR_LIST, exception.toJson());
        }

        // if we have channel data, write to parse list
        if (channelData != null && channelData.length() > 0) {
            Parserable parserable = new Parserable();
            parserable.setChannelId(mRetrievable.getChannelId());
            parserable.setData(channelData);
            mRedisManager.push(RedisManager.PARSE_LIST, parserable.toJson());
        }

        // write retrievable to store list
        mRedisManager.push(RedisManager.RETRIEVABLE_LIST, mRetrievable.toJson());

        /*** 3) print some statistics ***/
        long duration = new Date().getTime() - startedProcessingAt.getTime();
        sLogger.debug("Channel processing completed: " + mRetrievable.getChannelTitle());
        sLogger.debug("Time taken: " + duration + "ms");
    }

    /**
     * Gets the channels XML data
     * @return
     */
    private String getChannelData() {
        String channelData = null;
        ByteArrayOutputStream buffer = null;
        InputStream inputStream = null;
        HttpURLConnection connection = null;

        sLogger.debug("Processing retriever metadata: " + mRetrievable.getChannelTitle());

        try {
            connection = HttpUtility.getConnection(mRetrievable.getFeedUrl());
            connection.setUseCaches(true);
            connection.addRequestProperty("Accept-Encoding", "gzip,deflate");

            // only add the http caching functions if we aren't forcing an update and they are present
            if (!mRetrievable.isOverrideHttpCaching() && mRetrievable.getHttpLastModified() > -1) {
                connection.addRequestProperty("Last-Modified",
                        String.valueOf(mRetrievable.getHttpLastModified()));
            }

            if (!mRetrievable.isOverrideHttpCaching() && mRetrievable.getHttpETag() != null &&
                    mRetrievable.getHttpETag().trim().length() > 0) {
                connection.addRequestProperty("If-None-Match", mRetrievable.getHttpETag());
            }
            int responseCode = connection.getResponseCode();
            sLogger.debug("Response code: " + responseCode);
            sLogger.debug("Content-Length: " + connection.getContentLength());
            sLogger.debug("Content-Encoding: " + connection.getContentEncoding());

            if (responseCode == HttpURLConnection.HTTP_MOVED_PERM) {
                sLogger.warn(String.format("Podcast URL moved permanently: %s", mRetrievable.getChannelTitle()));
            }

            if (responseCode == HttpURLConnection.HTTP_OK || responseCode == HttpURLConnection.HTTP_MOVED_TEMP) {

                if (connection.getContentEncoding() != null) {

                    if (connection.getContentEncoding().equalsIgnoreCase("gzip") ||
                                connection.getContentEncoding().equalsIgnoreCase("x-gzip")) {
                        inputStream = new GZIPInputStream(connection.getInputStream());
                    } else if (connection.getContentEncoding().equalsIgnoreCase("deflate")) {
                        inputStream = new DeflaterInputStream(connection.getInputStream());
                    }
                }

                if (inputStream == null) {
                    inputStream = connection.getInputStream();
                }

                // get the data and store it to a variable
                buffer = new ByteArrayOutputStream();
                int nRead;
                byte[] data = new byte[mBufferSize];

                while ((nRead = inputStream.read(data, 0, data.length)) != -1) {
                    buffer.write(data, 0, nRead);
                }
                buffer.flush();
                channelData = buffer.toString("UTF-8").trim();

                // remove UTF-16 BOM character '\uFEFF
                if (channelData.startsWith("\uFEFF")) {
                    channelData = channelData.replace("\uFEFF", "");
                }

                if (!channelData.startsWith("<?xml") && !channelData.startsWith("<rss")) {
                    throw new WorkerException(mRetrievable.getChannelId(),
                            WorkerException.ExceptionType.ERROR_CONTENT_NOT_XML,
                            "Channel data isn't valid XML, does begin with <?xml");
                }

                // update the last-modified and etag
                updateHttpCacheHeaderValues(connection);

                // generate the MD5
                String newMd5 = StringHelper.generateMD5(channelData);

                // get the old md5
                String oldMd5 = mRetrievable.getDataMd5();

                // build an md5 of the channel data and if it's new or different, set the value
                if (oldMd5 == null || oldMd5.length() == 0 || !oldMd5.contentEquals(newMd5)) {
                    mRetrievable.setDataMd5(newMd5);
                }

                // null out channel data, unless we are forcing an update
                else if (!mRetrievable.isOverrideHttpCaching()) {
                    /// md5 is identical, null out the channel data, signifying there is nothing to update
                    channelData = null;
                }
            } else if (responseCode == HttpURLConnection.HTTP_NOT_MODIFIED) {
                sLogger.debug("Update not needed for retrievedChannel: " + mRetrievable.toString());
            } else if (responseCode >= 400 && responseCode <= 500) {
                throw new Exception("Error HTTP response code encountered: " + responseCode);
            }
        } catch (WorkerException e) {
            sLogger.warn("Error in parseChannel");
            sLogger.warn(e);
            throw e;
        } catch (Exception e) {
            sLogger.warn("Error in parseChannel");
            sLogger.warn(e);
            throw new WorkerException(mRetrievable.getChannelId(),
                    WorkerException.ExceptionType.ERROR_CONNECTION_FAILED,
                    e.getMessage());
        } finally {
            ResourceUtility.closeResources(new Object[] { buffer, inputStream, connection });
        }
        return channelData;
    }

    /**
     * Determines, based on HTTP header values, if a channel needs to be updated
     * @param connection
     */
    private void updateHttpCacheHeaderValues(HttpURLConnection connection) {
        long lastModified = connection.getLastModified();
        String eTag = connection.getHeaderField("ETag");

        if (lastModified > 0) {
            mRetrievable.setHttpLastModified(lastModified);
        }

        if (eTag != null) {
            mRetrievable.setHttpETag(eTag);
        }
    }
}