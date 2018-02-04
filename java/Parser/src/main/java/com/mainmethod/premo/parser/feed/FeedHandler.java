package com.mainmethod.premo.parser.feed;

import com.mainmethod.premo.util.object.Channel;
import com.mainmethod.premo.util.object.Episode;

import java.util.List;

/**
 * Created by evan on 5/19/15.
 */
public interface FeedHandler {

    List<Episode> processXml(Channel channel, String xmlData);

}
