package com.mainmethod.premo.util.data;

import org.junit.Test;

import java.util.Properties;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

/**
 * Created by evan on 11/2/14.
 */
public class RedisDatabaseTest {

    private Properties getProperties() {
        Properties properties = new Properties();
        properties.put("REDIS_URL", "localhost");
        properties.put("REDIS_BLOCKING_TIME", "1000");
        return properties;
    }

    @Test
    public void testCreateRedisManager() {
        Properties properties = getProperties();
        RedisManager manager = new RedisManager(properties);
        assertNotNull(manager);
    }

    @Test
    public void testPush() {
        Properties properties = getProperties();
        RedisManager manager = new RedisManager(properties);
        long size = manager.push("test", "hello world");
        assertTrue(size > -1);
    }

    @Test
    public void testPop() {
        Properties properties = getProperties();
        RedisManager manager = new RedisManager(properties);
        manager.push("test", "hello world");
        String val = manager.pop("test");
        assertEquals("hello world", val);
    }

    @Test
    public void testPoll() {
        Properties properties = getProperties();
        RedisManager manager = new RedisManager(properties);
        manager.push("test", "hello world");
        String val = manager.poll("test");
        assertEquals("hello world", val);
    }

    @Test
    public void testSize() {
        Properties properties = getProperties();
        RedisManager manager = new RedisManager(properties);
        manager.push("test", "hello world");
        assertTrue(manager.size("test") > 1);
    }
}
