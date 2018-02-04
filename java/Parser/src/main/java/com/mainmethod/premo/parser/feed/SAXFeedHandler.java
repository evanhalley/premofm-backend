package com.mainmethod.premo.parser.feed;

import com.mainmethod.premo.util.date.DateParser;
import com.mainmethod.premo.util.object.Channel;
import com.mainmethod.premo.util.object.Episode;
import com.mainmethod.premo.util.object.WorkerException;
import com.mainmethod.premo.util.resource.ResourceUtility;
import com.mainmethod.premo.util.string.StringHelper;
import com.mainmethod.premo.util.url.UrlHelper;
import org.apache.log4j.Logger;
import org.xml.sax.Attributes;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import org.xml.sax.helpers.DefaultHandler;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Parses a podcast RSS feed
 * Created by evan on 11/2/14.
 */
public class SAXFeedHandler extends DefaultHandler implements FeedHandler {

    private static final Logger sLogger = Logger.getLogger(SAXFeedHandler.class.getSimpleName());

    private List<Episode> mEpisodeList;
    private Episode mCurrentEpisode;
    private StringBuilder mCharacters;
    private Channel mChannel;
    private DateParser mDateParser;

    private boolean mParsingEpisode;
    private boolean mParseChannel;
    private boolean mReadCharacters;

    public SAXFeedHandler() {
        mEpisodeList = new ArrayList<>(512);
        mCharacters = new StringBuilder(512);
    }

    @Override
    public List<Episode> processXml(Channel channel, String xmlData) {
        InputStream reader = null;
        mChannel = channel;

        try {
            long start = new Date().getTime();
            SAXParserFactory saxParserFactory = SAXParserFactory.newInstance();
            saxParserFactory.setValidating(true);
            saxParserFactory.setNamespaceAware(true);
            SAXParser saxParser = saxParserFactory.newSAXParser();
            reader = new ByteArrayInputStream(xmlData.getBytes("UTF-8"));
            saxParser.parse(reader, this);
            long end = DateParser.now().getTime();
            sLogger.debug(String.format("XML Processing time: %d ms", end - start));
        } catch (ParserConfigurationException | SAXException | NumberFormatException e) {
            sLogger.warn("Error in parseChannel");
            sLogger.warn(e);
            throw new WorkerException(mChannel.getId(), WorkerException.ExceptionType.ERROR_CANNOT_PARSE, e.getMessage());
        } catch (Exception e) {
            sLogger.warn("Error in parseChannel");
            sLogger.warn(e);
            throw new WorkerException(mChannel.getId(), WorkerException.ExceptionType.ERROR_OTHER, e.getMessage());
        } finally {
            ResourceUtility.closeResource(reader);
        }
        return mEpisodeList;
    }

    @Override
    public void startElement(String uri, String localName,
                             String qName, Attributes attributes)
            throws SAXException {

        if (qName.contentEquals("channel")) {
            mParseChannel = true;
        } else if (qName.contentEquals("item")) {
            mParseChannel = false;
            mParsingEpisode = true;
            mCurrentEpisode = new Episode();
        }

        if (mParsingEpisode) {

            switch (qName) {
                case "title":
                case "link":
                case "pubDate":
                case "description":
                case "content:encoded":
                case "guid":
                case "itunes:duration":
                    mReadCharacters = true;
                    mCharacters.setLength(0);
                    break;
                case "enclosure":
                    loadMediaAttributes(attributes);
                    break;
                default:
                    break;
            }
        }

        if (mParseChannel) {

            switch (qName) {
                case "title":
                case "link":
                case "description":
                case "itunes:author":
                case "itunes:keywords":
                    mReadCharacters = true;
                    mCharacters.setLength(0);
                    break;
                case "itunes:image":
                    loadImageAttributes(attributes);
                    break;
                default:
                    break;
            }
        }
    }

    @Override
    public void endElement(String uri, String localName, String qName)
            throws SAXException {

        if (qName.contentEquals("item")) {
            mParsingEpisode = false;

            if (mCurrentEpisode.getMediaUrl() != null && mCurrentEpisode.getMediaUrl().length() > 0) {

                /** if the guid is null, generate one based on the media url **/
                if (mCurrentEpisode.getGuid() == null || mCurrentEpisode.getGuid().length() == 0) {

                    try {
                        mCurrentEpisode.setGuid(StringHelper.generateMD5(mCurrentEpisode.getMediaUrl()));
                    } catch (Exception e) {
                        mCurrentEpisode.setGuid(mCurrentEpisode.getMediaUrl());
                    }
                }
                Date now = DateParser.now();
                mCurrentEpisode.setChannelId(mChannel.getId());
                mCurrentEpisode.setCreatedAt(now);
                mCurrentEpisode.setUpdatedAt(now);
                mEpisodeList.add(mCurrentEpisode);
            }
            mCurrentEpisode = null;
        }

        if (mParsingEpisode) {

            switch (qName) {
                case "title":
                    mCurrentEpisode.setTitle(getCharacters());
                    break;
                case "link":
                    String url = getCharacters();

                    if (UrlHelper.isValidUrl(url)) {
                        mCurrentEpisode.setUrl(url);
                    }
                    break;
                case "pubDate":
                    mCurrentEpisode.setPublishedAt(parseDate(getCharacters()));
                    break;
                case "description":
                    if (mCurrentEpisode.getDescription() == null || mCurrentEpisode.getDescription().length() == 0) {
                        mCurrentEpisode.setDescription(getCharacters());
                    }
                    break;
                case "content:encoded":
                    mCurrentEpisode.setDescription(getCharacters());
                    break;
                case "guid":
                    String guid = getCharacters();

                    try {
                        mCurrentEpisode.setGuid(StringHelper.generateMD5(guid));
                    } catch (Exception e) {
                        mCurrentEpisode.setGuid(guid);
                    }
                    break;
                case "itunes:duration":
                    mCurrentEpisode.setDuration(parseDuration(getCharacters()));
                    break;
            }
        }

        if (mParseChannel) {

            switch (qName) {
                case "title":
                    mChannel.setTitle(getCharacters());
                    break;
                case "link":
                    String url = getCharacters();

                    if (UrlHelper.isValidUrl(url)) {
                        mChannel.setSiteUrl(url);
                    }
                    break;
                case "description":
                    mChannel.setDescription(getCharacters());
                    break;
                case "itunes:author":
                    mChannel.setAuthor(getCharacters());
                    break;
                case "itunes:keywords":
                    mChannel.setKeywords(getCharacters());
                    break;
            }
        }
    }

    @Override
    public void characters(char ch[], int start, int length)
            throws SAXException {

        if (mReadCharacters) {
            mCharacters.append(new String(ch, start, length));
        }
    }

    /**
     * Returns the contents of the character stream
     * @return
     */
    private String getCharacters() {
        String val = mCharacters.toString().trim();
        val = StringHelper.sanitizeString(val);
        mReadCharacters = false;
        mCharacters.setLength(0);
        return val;
    }

    private long parseDuration(String durationStr) {
        return DateParser.parseDuration(durationStr.trim());
    }

    private Date parseDate(String dateStr) {

        if (mDateParser == null) {
            mDateParser = new DateParser();
        }
        return DateParser.convertLocalDateTimeToDate(mDateParser.parseDate(dateStr.trim()));
    }

    /**
     * Populates the current episode with the artwork details
     * @param attributes
     */
    private void loadImageAttributes(Attributes attributes) {
        String artworkUrl = attributes.getValue("href");

        if (artworkUrl != null && artworkUrl.trim().length() > 0 && UrlHelper.isValidUrl(artworkUrl)) {
            mChannel.setArtworkUrl(artworkUrl.trim());
        }
    }

    /**
     * Populates the current episode with the media details
     * @param attributes
     */
    private void loadMediaAttributes(Attributes attributes) {
        String url = attributes.getValue("url");
        String sizeStr = attributes.getValue("length");
        String mimeType = attributes.getValue("type");

        if (url != null && url.trim().length() > 0 && UrlHelper.isValidUrl(url)) {
            mCurrentEpisode.setMediaUrl(url.trim());
        }

        if (mimeType != null && mimeType.trim().length() > 0) {
            mCurrentEpisode.setMimeType(mimeType.trim().toLowerCase());
        }

        if (sizeStr != null && sizeStr.trim().length() > 0) {

            try {
                mCurrentEpisode.setSize(Long.parseLong(sizeStr.trim().replace(",", "")));
            } catch (NumberFormatException e) {
                mCurrentEpisode.setSize(0);
            }
        }
    }
}