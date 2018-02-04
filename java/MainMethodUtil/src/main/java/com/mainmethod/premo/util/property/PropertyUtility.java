package com.mainmethod.premo.util.property;

import com.mainmethod.premo.util.resource.ResourceUtility;
import org.apache.log4j.Logger;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * @author evan
 *
 */
public class PropertyUtility {

    private static final Logger sLogger = Logger.getLogger(PropertyUtility.class.getSimpleName());

    /**
     * Creates a properties object from a properties file
     * @param file
     * @return
     * @throws Exception
     */
    public static Properties readFile(String file) throws IOException, IllegalArgumentException {

        if (file == null || file.trim().length() == 0) {
            throw new IllegalArgumentException("Null/empty file name used as an argument");
        }
        File fileObj = new File(file);
        InputStream inputStream = null;
        // initiate the properties
        Properties properties = null;

        try {
            sLogger.info("Reading properties file: " + file);
            inputStream = new FileInputStream(fileObj);
            properties = new Properties();
            properties.load(inputStream);
        } catch (IOException e) {
            sLogger.error("Error encountered in readFile");
            sLogger.error(e.getMessage());
            throw e;
        } finally {
            ResourceUtility.closeResources(new Object[]{inputStream});
        }

        return properties;
    }

}