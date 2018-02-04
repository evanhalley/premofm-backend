package com.mainmethod.premo.util.string;

import java.io.UnsupportedEncodingException;
import java.math.BigInteger;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Helper functions for  processing strings
 * Created by evan on 1/6/15.
 */
public class StringHelper {

    /**
     * Removes illegal characters from the input string
     * @param dirty
     * @return
     */
    public static String sanitizeString(String dirty) {

        if (dirty == null) {
            return null;
        }
        return dirty.replaceAll("[\\u2018\\u2019]", "'").replaceAll("[\\u201C\\u201D]", "\"");
    }

    /**
     * Generates an MD5 hash based on the contents of the data
     * @param data
     * @return
     * @throws NoSuchAlgorithmException
     * @throws UnsupportedEncodingException
     */
    public static String generateMD5(String data) throws NoSuchAlgorithmException, UnsupportedEncodingException {
        byte[] bytes = data.getBytes("UTF-8");
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] digest = md.digest(bytes);
        BigInteger bigInt = new BigInteger(1, digest);
        return bigInt.toString(16);
    }
}