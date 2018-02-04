package com.mainmethod.premo.util.context;

import org.junit.Test;

import java.util.Properties;

import static org.junit.Assert.*;

/**
 * Created by evan on 5/14/15.
 */
public class ContextManagerTest {

    @Test
    public void getInstanceTest() {
        ContextManager contextManager = ContextManager.getInstance();
        assertNotNull(contextManager);
    }

    @Test
    public void addPropertiesTest() {
        ContextManager contextManager = ContextManager.getInstance();
        Properties properties = new Properties();
        properties.put("foo", "bar");
        contextManager.addProperties(properties);
        assertEquals("bar", contextManager.getProperty("foo"));
    }

    @Test
    public void addPropertiesNullTest() {
        ContextManager contextManager = ContextManager.getInstance();
        contextManager.addProperties(null);
        assertNotNull(contextManager.getProperties());
    }

    @Test
    public void getPropertiesTest() {
        ContextManager contextManager = ContextManager.getInstance();
        Properties properties = new Properties();
        properties.put("foo", "bar");
        contextManager.addProperties(properties);
        assertEquals(properties, contextManager.getProperties());
    }
}
