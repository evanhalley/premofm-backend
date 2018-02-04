package com.mainmethod.premo.util.url;

import org.apache.commons.validator.routines.UrlValidator;

/**
 * Created by evan on 8/22/15.
 */
public class UrlHelper {

    /**
     * Returns true if the url is valid
     * @param url url to validate
     * @return true if the url is valid
     */
    public static boolean isValidUrl(String url) {

        if (url == null || url.trim().length() == 0) {
            return false;
        }

        return UrlValidator.getInstance().isValid(url.trim());
    }
}
