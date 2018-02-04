package com.mainmethod.premo.parser.feed;

import com.mainmethod.premo.util.date.DateParser;
import com.mainmethod.premo.util.object.Channel;
import com.mainmethod.premo.util.object.Episode;
import com.mainmethod.premo.util.object.WorkerException;
import com.mainmethod.premo.util.resource.ResourceUtility;
import com.mainmethod.premo.util.string.StringHelper;
import com.mainmethod.premo.util.url.UrlHelper;
import org.apache.log4j.Logger;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamReader;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Parses podcast channel XML using a STAX parser
 * Created by evan on 5/19/15.
 */
public class STAXFeedHandler implements FeedHandler {

    private static final Logger sLogger = Logger.getLogger(STAXFeedHandler.class.getSimpleName());

    private Channel mChannel;
    private Episode mCurrentEpisode;
    private DateParser mDateParser;
    private boolean mParsingChannel;
    private boolean mParsingEpisode;
    private StringBuilder mTagContent;

    @Override
    public List<Episode> processXml(Channel channel, String xmlData) {
        XMLInputFactory xmlInputFactory = XMLInputFactory.newInstance();
        InputStream inputStream = null;
        XMLStreamReader streamReader = null;
        mChannel = channel;
        List<Episode> parsedEpisodes = new ArrayList<>(512);
        mTagContent = new StringBuilder(512);

        try {
            inputStream = new ByteArrayInputStream(xmlData.getBytes("UTF-8"));
            streamReader = xmlInputFactory.createXMLStreamReader(inputStream, "UTF-8");

            while (streamReader.hasNext()) {
                int event = streamReader.next();

                switch (event) {
                    case XMLStreamConstants.START_ELEMENT:

                        if (streamReader.getLocalName() == "channel") {
                            mParsingChannel = true;
                        } else if (streamReader.getLocalName() == "item") {
                            mParsingChannel = false;
                            mParsingEpisode = true;
                            mCurrentEpisode =  new Episode();
                        } else if (mParsingChannel) {
                            mTagContent.setLength(0);

                            // parse xml elements that have attributes we need
                            if (streamReader.getLocalName() == "image") {
                                loadImageAttributes(streamReader);
                            }
                        } else if (mParsingEpisode) {
                            mTagContent.setLength(0);

                            // parse xml elements that have attributes we need
                            if (streamReader.getLocalName() == "enclosure") {
                                loadMediaAttributes(streamReader);
                            }
                        }
                        break;
                    case XMLStreamConstants.CHARACTERS:

                        if (mParsingChannel || mParsingEpisode) {
                            mTagContent.append(streamReader.getText().trim());
                        }
                        break;
                    case XMLStreamConstants.END_ELEMENT:

                        if (mParsingChannel) {
                            parseChannelData(streamReader.getLocalName());
                        } else if (mParsingEpisode) {

                            // done parsing the episode, add it to the episode list
                            if (streamReader.getLocalName() == "item") {
                                mParsingEpisode = false;

                                if (mCurrentEpisode.getMediaUrl() != null &&
                                        mCurrentEpisode.getMediaUrl().length() > 0) {

                                    /** if the guid is null, generate one based on the media url **/
                                    if (mCurrentEpisode.getGuid() == null || mCurrentEpisode.getGuid().length() == 0) {
                                        mCurrentEpisode.setGuid(StringHelper.generateMD5(mCurrentEpisode.getMediaUrl()));
                                    }

                                    Date now = DateParser.now();
                                    mCurrentEpisode.setChannelId(mChannel.getId());
                                    mCurrentEpisode.setCreatedAt(now);
                                    mCurrentEpisode.setUpdatedAt(now);
                                    parsedEpisodes.add(mCurrentEpisode);
                                }
                                mCurrentEpisode = null;
                            } else {
                                parseEpisodeData(streamReader.getLocalName());
                            }
                        }

                        break;
                }
            }
        } catch (Exception e) {
            sLogger.warn("Error in parseChannel", e);
            throw new WorkerException(mChannel.getId(), WorkerException.ExceptionType.ERROR_CANNOT_PARSE, e.getMessage());
        } finally {
            ResourceUtility.closeResources(new Object[]{streamReader, inputStream});
        }

        return parsedEpisodes;
    }

    private void parseChannelData(String tagName) {
        String tagContent = StringHelper.sanitizeString(mTagContent.toString()).trim();

        if (tagContent.length() == 0) {
            return;
        }

        switch (tagName) {
            case "title":
               mChannel.setTitle(tagContent);
                break;
            case "link":
                if (UrlHelper.isValidUrl(tagContent)) {
                    mChannel.setSiteUrl(tagContent);
                }
                break;
            case "description":
                mChannel.setDescription(tagContent);
                break;
            case "author":
               mChannel.setAuthor(tagContent);
                break;
            case "keywords":
                mChannel.setKeywords(tagContent);
                break;
            default:
                break;
        }
    }

    private void parseEpisodeData(String tagName) {
        String tagContent = StringHelper.sanitizeString(mTagContent.toString());
        tagContent = tagContent.trim();

        if (tagContent.length() == 0) {
            return;
        }

        switch (tagName) {
            case "title":
                mCurrentEpisode.setTitle(tagContent);
                break;
            case "link":
                if (UrlHelper.isValidUrl(tagContent)) {
                    mCurrentEpisode.setUrl(tagContent);
                }
                break;
            case "pubDate":
                mCurrentEpisode.setPublishedAt(parseDate(tagContent));
                break;
            case "description":
                
                if (mCurrentEpisode.getDescription() == null || mCurrentEpisode.getDescription().length() == 0) {
                    mCurrentEpisode.setDescription(tagContent);
                }
                break;
            case "content:encoded":
                mCurrentEpisode.setDescription(tagContent);
                break;
            case "guid":
                try {
                    mCurrentEpisode.setGuid(StringHelper.generateMD5(tagContent));
                } catch (Exception e) {
                    mCurrentEpisode.setGuid(tagContent);
                }
                break;
            case "duration":
                mCurrentEpisode.setDuration(parseDuration(tagContent));
                break;
            default:
                break;
        }
    }

    /**
     * Populates the current episode with the artwork URL
     * @param streamReader
     */
    private void loadImageAttributes(XMLStreamReader streamReader) {

        if (streamReader == null) {
            return;
        }

        for (int i = 0; i < streamReader.getAttributeCount(); i++) {

            if (streamReader.getAttributeLocalName(i).contentEquals("href")) {
                String value = streamReader.getAttributeValue(i);

                if (UrlHelper.isValidUrl(value)) {
                    mChannel.setArtworkUrl(value);
                }
                break;
            }
        }
    }

    /**
     * Populates the current episode with the media details
     * @param streamReader
     */
    private void loadMediaAttributes(XMLStreamReader streamReader) {

        if (streamReader == null) {
            return;
        }

        for (int i = 0; i < streamReader.getAttributeCount(); i++) {

            switch (streamReader.getAttributeLocalName(i)) {
                case "url":
                    String value = streamReader.getAttributeValue(i).trim();

                    if (UrlHelper.isValidUrl(value)) {
                        mCurrentEpisode.setMediaUrl(value);
                    }
                    break;
                case "length":
                    String sizeStr = streamReader.getAttributeValue(i).replace(",", "");

                    if (sizeStr.length() > 0) {

                        try {
                            // TODO, handle sizes like 1.4MB
                            mCurrentEpisode.setSize(Long.parseLong(sizeStr));
                        } catch (NumberFormatException e) {
                            mCurrentEpisode.setSize(0);
                        }
                    }
                    break;
                case "type":
                    mCurrentEpisode.setMimeType(streamReader.getAttributeValue(i).trim().trim().toLowerCase());
                    break;
            }
        }
    }

    private long parseDuration(String durationStr) {
        long duration = 0;

        if (durationStr != null && durationStr.trim().length() > 0) {
            duration = DateParser.parseDuration(durationStr);
        }
        return duration;
    }

    private Date parseDate(String dateStr) {

        if (mDateParser == null) {
            mDateParser = new DateParser();
        }
        return DateParser.convertLocalDateTimeToDate(mDateParser.parseDate(dateStr.trim()));
    }
}
