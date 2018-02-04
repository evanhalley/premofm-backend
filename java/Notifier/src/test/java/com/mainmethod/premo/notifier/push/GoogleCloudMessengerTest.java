package com.mainmethod.premo.notifier.push;

import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.data.RedisManager;
import com.mainmethod.premo.util.http.HttpUtility;
import org.json.JSONObject;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Properties;

import static org.mockito.Mockito.*;

/**
 * Created by evan on 10/2/15.
 */
public class GoogleCloudMessengerTest {

    private RedisManager mMockedRedisManager;
    private final String SUCCESSFUL_RESPONSE = new JSONObject()
            .put("failures", 0)
            .put("multicast_id", "1234")
            .put("failure", "0")
            .put("canonical_ids", "0")
            .toString();



    @Before
    public void setUp(  ) {
        Properties properties = new Properties();
        properties.put("GCM_SERVER_URL", "http://url.com");
        properties.put("GCM_API_KEY", "asdfghjk");
        properties.put("MAX_RETRIES", "3");
        properties.put("SLEEP_INTERVAL", "1");
        ContextManager.getInstance().addProperties(properties);
        mMockedRedisManager = mock(RedisManager.class);
    }


    @Test
    public void successfulSendTest() {
        HttpUtility.Response response = new HttpUtility.Response();
        response.setResponseBody(SUCCESSFUL_RESPONSE);
        response.setResponseCode(200);
        response.setHeaderFields(new HashMap<String, List<String>>());
        HttpUtility mockedHttpUtility = mock(HttpUtility.class);
        when(mockedHttpUtility.sendPostData(anyString(), anyString(), anyMapOf(String.class, String.class))).thenReturn(response);
        GoogleCloudMessenger messenger = new GoogleCloudMessenger(mMockedRedisManager, mockedHttpUtility);
        CloudMessenger.StatusCode result = messenger.send(new String[]{"abc123"}, new JSONObject().put("data", "data"));
        Assert.assertEquals(CloudMessenger.StatusCode.SUCCESSFUL, result);
    }

    @Test
    public void authErrorTest() {
        HttpUtility.Response response = new HttpUtility.Response();
        response.setResponseBody(SUCCESSFUL_RESPONSE);
        response.setResponseCode(401);
        response.setHeaderFields(new HashMap<String, List<String>>());
        HttpUtility mockedHttpUtility = mock(HttpUtility.class);
        when(mockedHttpUtility.sendPostData(anyString(), anyString(), anyMapOf(String.class, String.class))).thenReturn(response);
        GoogleCloudMessenger messenger = new GoogleCloudMessenger(mMockedRedisManager, mockedHttpUtility);
        CloudMessenger.StatusCode result = messenger.send(new String[]{"abc123"}, new JSONObject().put("data", "data"));
        Assert.assertEquals(CloudMessenger.StatusCode.FAILURE, result);
    }

    @Test
    public void jsonNoParseTest() {
        HttpUtility.Response response = new HttpUtility.Response();
        response.setResponseBody(SUCCESSFUL_RESPONSE);
        response.setResponseCode(400);
        response.setHeaderFields(new HashMap<String, List<String>>());
        HttpUtility mockedHttpUtility = mock(HttpUtility.class);
        when(mockedHttpUtility.sendPostData(anyString(), anyString(), anyMapOf(String.class, String.class))).thenReturn(response);
        GoogleCloudMessenger messenger = new GoogleCloudMessenger(mMockedRedisManager, mockedHttpUtility);
        CloudMessenger.StatusCode result = messenger.send(new String[]{"abc123"}, new JSONObject().put("data", "data"));
        Assert.assertEquals(CloudMessenger.StatusCode.FAILURE, result);
    }

    @Test
    public void serverErrorTest() {
        HttpUtility.Response response = new HttpUtility.Response();
        response.setResponseBody(SUCCESSFUL_RESPONSE);
        response.setResponseCode(500);
        response.setHeaderFields(new HashMap<String, List<String>>());
        HttpUtility mockedHttpUtility = mock(HttpUtility.class);
        when(mockedHttpUtility.sendPostData(anyString(), anyString(), anyMapOf(String.class, String.class))).thenReturn(response);
        GoogleCloudMessenger messenger = new GoogleCloudMessenger(mMockedRedisManager, mockedHttpUtility);
        CloudMessenger.StatusCode result = messenger.send(new String[]{"abc123"}, new JSONObject().put("data", "data"));
        Assert.assertEquals(CloudMessenger.StatusCode.FAILURE, result);
    }

    @Test
    public void unknownErrorTest() {
        HttpUtility.Response response = new HttpUtility.Response();
        response.setResponseBody(SUCCESSFUL_RESPONSE);
        response.setResponseCode(5000);
        response.setHeaderFields(new HashMap<String, List<String>>());
        HttpUtility mockedHttpUtility = mock(HttpUtility.class);
        when(mockedHttpUtility.sendPostData(anyString(), anyString(), anyMapOf(String.class, String.class))).thenReturn(response);
        GoogleCloudMessenger messenger = new GoogleCloudMessenger(mMockedRedisManager, mockedHttpUtility);
        CloudMessenger.StatusCode result = messenger.send(new String[]{"abc123"}, new JSONObject().put("data", "data"));
        Assert.assertEquals(CloudMessenger.StatusCode.FAILURE, result);
    }

}
