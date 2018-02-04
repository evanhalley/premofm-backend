package com.mainmethod.premo.util.http;

import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.resource.ResourceUtility;
import org.apache.log4j.Logger;

import javax.net.ssl.HttpsURLConnection;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Map;

/**
 * Manages connecting to the internet
 * Created by evan on 7/10/14.
 */
public class HttpUtility {
    private static Logger sLogger = Logger.getLogger(HttpUtility.class.getSimpleName());

    public HttpUtility() {

    }

    /**
     * Returns a HTTPS URL connection object for consumption
     *
     * @param urlStr
     * @return
     * @throws java.io.IOException
     */
    public HttpURLConnection getConnection(String urlStr) throws IOException {

        if (urlStr == null || urlStr.trim().length() == 0) {
            throw new IllegalArgumentException("urlStr cannot be null or empty");
        }

        HttpURLConnection connection;
        urlStr = urlStr.trim();
        sLogger.debug("Creating a new HTTP connection: " + urlStr);

        int connectionTimeout = Integer.parseInt(ContextManager.getInstance().getProperty("CONNECTION_TIMEOUT"));
        int readTimeout = Integer.parseInt(ContextManager.getInstance().getProperty("READ_TIMEOUT"));
        URL url = new URL(urlStr.trim());

        if(url.getProtocol().toLowerCase().contentEquals("https")) {
            connection = (HttpsURLConnection) url.openConnection();
        } else {
            connection = (HttpURLConnection) url.openConnection();
        }
        connection.setInstanceFollowRedirects(true);
        connection.setConnectTimeout(connectionTimeout);
        connection.setReadTimeout(readTimeout);
        connection.setRequestProperty("User-Agent", ContextManager.getInstance().getProperty("USER_AGENT"));
        return connection;
    }

    /**
     * Returns string data from the specified URL
     * @param url
     * @return
     */
    public String getData(String url) {
        StringBuilder data = new StringBuilder();
        HttpURLConnection connection = null;
        BufferedReader reader = null;

        try {
            connection = getConnection(url);
            reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            sLogger.debug("Connected to URL: " + url + ", response code: " + connection.getResponseCode());
            String line;

            while ((line = reader.readLine()) != null) {
                data.append(line);
            }
            sLogger.debug("Content Size: " + data.length());
        } catch (IOException e) {
            sLogger.error("Error retrieving data from URL: " + url);
            sLogger.error(e.toString());
        } finally {
            ResourceUtility.closeResources(new Object[]{connection, reader});
        }
        return data.toString();
    }

    /**
     * Send some data to a URL without headers, returns a response with a status code, headers, and body
     * @param url
     * @param data
     * @return
     */
    public Response sendPostData(String url, String data) {
        return sendPostData(url, data, null);
    }

    /**
     * Send some data to a URL with optional headers, returns a response with a status code, headers, and body
     * @param url
     * @param data
     * @param header
     * @return
     */
    public Response sendPostData(String url, String data, Map<String, String> header) {
        sLogger.info("Posting data to " + url);
        Response response = null;
        HttpURLConnection connection = null;
        DataOutputStream output = null;
        BufferedReader input = null;

        if(url != null && data != null) {

            try {
                connection = getConnection(url);

                // configure the connection
                connection.setRequestMethod("POST");
                connection.setDoInput(true);
                connection.setDoOutput(true);

                // configure the header
                if (header != null) {
                    sLogger.debug("Adding header information to connection");

                    for (String key : header.keySet()) {
                        connection.setRequestProperty(key, header.get(key));
                    }
                }

                // set up the output stream and send some data
                byte[] dataBytes = data.getBytes("UTF-8");
                sLogger.debug("Sending " + dataBytes.length + " bytes");
                output = new DataOutputStream(connection.getOutputStream());
                output.write(dataBytes);
                output.flush();

                // check the response
                int responseCode = connection.getResponseCode();
                sLogger.debug("Response code: " + responseCode);
                response = new Response();
                response.setResponseCode(responseCode);
                response.setHeaderFields(connection.getHeaderFields());

                // if the response is good, check for a response body
                if (responseCode == HttpsURLConnection.HTTP_OK) {
                    // set up the input stream to receive some data
                    input = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                    String line;
                    StringBuilder body = new StringBuilder();

                    while ((line = input.readLine()) != null) {
                        body.append(line);
                    }
                    response.setResponseBody(body.toString());
                    sLogger.debug("Received " + response.getResponseBody().getBytes("UTF-8").length +
                            " bytes");
                }
            } catch (IOException e) {
                sLogger.error("Error occured while sending data");
                sLogger.error(e);
            } finally {
                ResourceUtility.closeResources(new Object[]{connection, input, output});
            }
        }
        return response;
    }

    public static class Response {

        private int mResponseCode;
        private Map<String, List<String>> mHeaderFields;
        private String mResponseBody;

        public int getResponseCode() {
            return mResponseCode;
        }

        public void setResponseCode(int responseCode) {
            mResponseCode = responseCode;
        }

        public String getResponseBody() {
            return mResponseBody;
        }

        public void setResponseBody(String responseBody) {
            mResponseBody = responseBody;
        }

        public Map<String, List<String>> getHeaderFields() {
            return mHeaderFields;
        }

        public void setHeaderFields(Map<String, List<String>> headerFields) {
            mHeaderFields = headerFields;
        }
    }
}