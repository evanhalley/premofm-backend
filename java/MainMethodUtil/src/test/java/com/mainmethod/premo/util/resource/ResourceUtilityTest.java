package com.mainmethod.premo.util.resource;

import org.junit.Test;

import java.util.ArrayList;

import static org.junit.Assert.*;

/**
 * Created by evan on 5/14/15.
 */
public class ResourceUtilityTest {

    @Test
    public void closeResourceNull() {
        ResourceUtility.closeResource(null);
        assertTrue(true);
    }

    @Test
    public void closeResourcesNull() {
        ResourceUtility.closeResources(null);
        assertTrue(true);
    }

    @Test
    public void closeResourcesEmptyArray() {
        ResourceUtility.closeResources(new Object[0]);
        assertTrue(true);
    }

    @Test
    public void closeResourceUnsupportedType() {
        ResourceUtility.closeResource(new ArrayList<String>());
        assertTrue(true);
    }
}
