package com.mainmethod.premo.util;

import com.mainmethod.premo.util.property.PropertyUtility;
import org.junit.Test;

import java.util.Properties;

import static org.junit.Assert.*;

/**
 * Created by evan on 11/2/14.
 */
public class PropertyUtilityTest {

    @Test
    public void testNullPropertiesFile() {
        try {
            Properties props = PropertyUtility.readFile(null);
        } catch (Exception e) {
            assertNotNull(e);
        }
    }

}
