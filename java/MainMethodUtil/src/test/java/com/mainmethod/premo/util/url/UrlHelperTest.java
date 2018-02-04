package com.mainmethod.premo.util.url;

import org.junit.Test;

import static org.junit.Assert.*;

/**
 * Created by evan on 8/22/15.
 */
public class UrlHelperTest {

    @Test
    public void testIsUrlValid() {
        assertEquals(true, UrlHelper.isValidUrl("http://google.com"));
        assertEquals(true, UrlHelper.isValidUrl("http://google.com/test"));
        assertEquals(true, UrlHelper.isValidUrl("http://google.com?hello=foo&foo=bar"));
        assertEquals(true, UrlHelper.isValidUrl("http://www.google.com"));
        assertEquals(false, UrlHelper.isValidUrl("google.com"));
        assertEquals(false, UrlHelper.isValidUrl(""));
        assertEquals(false, UrlHelper.isValidUrl(" "));
        assertEquals(false, UrlHelper.isValidUrl(null));
    }
}
