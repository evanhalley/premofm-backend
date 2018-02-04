package com.mainmethod.podcastcrawler;

import com.mainmethod.podcastcrawler.data.DatabaseManager;
import com.mainmethod.podcastcrawler.object.CrawledChannel;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.property.PropertyUtility;
import com.mainmethod.premo.util.resource.ResourceUtility;
import com.opencsv.CSVReader;
import com.opencsv.CSVWriter;
import com.squareup.okhttp.OkHttpClient;
import com.squareup.okhttp.Request;
import com.squareup.okhttp.Response;
import org.apache.commons.lang3.StringUtils;
import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Created by evan on 5/10/15.
 */
public class Crawler {

    private static Logger sLogger = Logger.getLogger(Crawler.class.getSimpleName());
    private static final int SET_INIT_SIZE = 600_000;

    private static final String PODCAST_ID_REGEX = "http.*/id(\\d+)";
    private static final String PODCAST_HOME_URL = "https://itunes.apple.com/us/genre/podcasts/id26?mt=2";
    private static final String LOOKUP_API_URL = "https://itunes.apple.com/lookup?id=";
    private static final String PODCAST_IDS_FILE = "podcast_ids.txt";
    private static final String PODCAST_METADATA_FILE = "podcast_metadata.csv";

    private Pattern mPattern;

    public static void main(String[] args) {
        Crawler crawler = new Crawler();

        try {
            // initialize the crawler
            crawler.init();
            Set<String> podcastIds = new HashSet<>();

            String podcastIdsStr = ContextManager.getInstance().getProperty("MANUALLY_IMPORT_ITUNES_IDS");

            if (podcastIdsStr != null && podcastIdsStr.trim().length() > 0) {
                String[] podcastIdsArr = podcastIdsStr.split(",");

                for (int i = 0; i < podcastIdsArr.length; i++) {
                    podcastIds.add(podcastIdsArr[i]);
                }
            }

            else if (!crawler.podcastIdsFileExists()) {

                // get the subgenre urls
                List<String> subgenreUrls = crawler.getGenreUrls();
                int genresToProcess = Integer.parseInt(ContextManager.getInstance().getProperty("NUMBER_GENRES_TO_PROCESS"));

                // get the podcast ids
                int genresProcessed = 0;

                for (String subgenreUrl : subgenreUrls) {
                    podcastIds.addAll(crawler.getPodcastIds(subgenreUrl));
                    sLogger.info(String.format("Number of podcast IDs: %d", podcastIds.size()));
                    genresProcessed++;

                    if (genresToProcess > 0 && genresProcessed >= genresToProcess) {
                        break;
                    }
                }
                sLogger.info(String.format("Number of genres processed: %d", genresProcessed));

                // write the IDs to a text file
                crawler.writePodcastIds(podcastIds);
            } else {
                sLogger.info("Podcast IDs file already exists");
            }

            // query the api and get podcast metadata
            boolean retrievePodcastMetadata = Boolean.parseBoolean(
                    ContextManager.getInstance().getProperty("RETRIEVE_PODCAST_METADATA"));

            if (podcastIds.size() > 0) {
                crawler.writePodcastMetadata(new ArrayList<>(podcastIds));
            }
            else if (retrievePodcastMetadata) {

                if (!crawler.metadataCsvExists()) {
                    crawler.retrievePodcastMetadata();
                } else {
                    sLogger.info("Metadata file already exists");
                }
            }

            // query the api and get podcast metadata
            boolean loadPodcastsIntoDb = Boolean.parseBoolean(
                    ContextManager.getInstance().getProperty("LOAD_PODCASTS_INTO_DB"));

            if (loadPodcastsIntoDb) {
                crawler.loadPodcastsIntoDb();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void init() throws IOException {

        // initialize the logger
        PropertyConfigurator.configure(PropertyUtility.readFile("conf/log4j.properties"));

        ContextManager contextManager = ContextManager.getInstance();
        contextManager.addProperties(PropertyUtility.readFile("conf/application.properties"));
        contextManager.addProperties(PropertyUtility.readFile("conf/database.properties"));

        mPattern = Pattern.compile(PODCAST_ID_REGEX);
    }

    private boolean podcastIdsFileExists() {
        File file = new File(PODCAST_IDS_FILE);
        return file.exists() && !file.isDirectory();
    }

    private boolean metadataCsvExists() {
        File file = new File(PODCAST_METADATA_FILE);
        return file.exists() && !file.isDirectory();
    }

    private void loadPodcastsIntoDb() throws Exception {
        sLogger.info("Bulk loading podcasts into database");
        CSVReader reader = null;
        int numberChannelsToBulkAtOnce = Integer.parseInt(
                ContextManager.getInstance().getProperty("NUMBER_CHANNELS_TO_BULK_AT_ONCE"));
        int channelImportLimit = Integer.parseInt(
                ContextManager.getInstance().getProperty("CHANNEL_IMPORT_LIMIT"));
        DatabaseManager databaseManager = new DatabaseManager();
        int numberInserted = 0;

        try {
            List<CrawledChannel> crawledChannels = new ArrayList<>();
            reader = new CSVReader(new FileReader(PODCAST_METADATA_FILE));
            String[] nextLine;

            while ((nextLine = reader.readNext()) != null) {
                CrawledChannel crawledChannel = new CrawledChannel();
                crawledChannel.setITunesId(Long.parseLong(nextLine[0]));
                crawledChannel.setAuthor(nextLine[1]);
                crawledChannel.setTitle(nextLine[2]);
                crawledChannel.setFeedUrl(nextLine[3]);
                crawledChannel.setArtworkUrl(nextLine[4]);
                String[] genresArr = StringUtils.split(nextLine[5], ',');
                List<String> genres = Arrays.asList(genresArr);
                crawledChannel.setGenres(genres);
                crawledChannels.add(crawledChannel);

                if (crawledChannels.size() == numberChannelsToBulkAtOnce) {
                    numberInserted += databaseManager.insertChannels(crawledChannels);
                    sLogger.info(String.format("Podcasts loaded: %d", numberInserted));
                    crawledChannels.clear();
                }

                if (channelImportLimit > 0 && numberInserted >= channelImportLimit) {
                    sLogger.info("Channel import limit encountered");
                    break;
                }
            }
        } catch (IOException e) {
            sLogger.error("Error opening podcast metadata file");
            throw e;
        } finally {
            ResourceUtility.closeResource(reader);
        }
    }

    private void retrievePodcastMetadata() throws Exception {
        BufferedReader reader = null;
        int totalNumberProcessed = 0;
        int idsToProcess = Integer.parseInt(ContextManager.getInstance().getProperty("NUM_IDS_TO_PROCESS_AT_ONCE"));
        long timeout = Long.parseLong(ContextManager.getInstance().getProperty("METADATA_PROCESS_TIMEOUT"));

        // load the podcast IDs text file
        try {
            reader = new BufferedReader(new FileReader(PODCAST_IDS_FILE));
            String line;
            List<String> podcastIds = new ArrayList<>(idsToProcess);

            while ((line = reader.readLine()) != null) {

                if (line.trim().length() > 0) {
                    podcastIds.add(line.trim());

                    if (podcastIds.size() >= idsToProcess) {
                        int processed = writePodcastMetadata(podcastIds);
                        totalNumberProcessed += processed;
                        sLogger.info(String.format("Number processed: %d", totalNumberProcessed));
                        podcastIds.clear();
                        Thread.sleep(timeout);
                    }
                }
            }
        } catch(IOException e) {
            sLogger.error("Error opening podcast IDs file");
            throw e;
        } finally {
            ResourceUtility.closeResource(reader);
        }
    }

    private int writePodcastMetadata(List<String> podcastIds) throws Exception {
        int numberOfChannelsProcessed = -1;
        CSVWriter writer = null;
        OkHttpClient httpClient = new OkHttpClient();
        String lookupUrl = LOOKUP_API_URL + StringUtils.join(podcastIds, ",");
        sLogger.debug(String.format("URL: %s", lookupUrl));
        Request request = new Request.Builder()
                .url(lookupUrl)
                .build();

        try {
            // get the podcast metadata from itunes
            Response response = httpClient.newCall(request).execute();

            // write the podcast metadata to a CSV
            String jsonStr = response.body().string();
            JSONArray metadataJson = new JSONObject(jsonStr).getJSONArray("results");
            List<String[]> rows = new ArrayList<>();

            for (int i = 0; i < metadataJson.length(); i++) {
                JSONObject metadataObj = metadataJson.getJSONObject(i);
                String[] row = new String[6];
                row[0] = String.valueOf(metadataObj.getLong("collectionId"));
                row[1] = metadataObj.getString("artistName").replace("\n", "");
                row[2] = metadataObj.getString("collectionName").replace("\n", "");
                row[3] = metadataObj.getString("feedUrl");
                row[4] = metadataObj.getString("artworkUrl600");
                row[5] = metadataObj.getJSONArray("genres").join(",").replace("\"", "");
                rows.add(row);
            }
            writer = new CSVWriter(new FileWriter(PODCAST_METADATA_FILE, true));
            writer.writeAll(rows);
            writer.flush();
            numberOfChannelsProcessed = rows.size();
        } catch (IOException e) {
            sLogger.error(String.format("Error retrieving data from the URL %s", lookupUrl));
            throw e;
        } catch (JSONException e) {
            sLogger.error(String.format("Malformed JSON encountered from URL %s", lookupUrl));
            throw e;
        } finally {
            ResourceUtility.closeResource(writer);
        }
        return numberOfChannelsProcessed;
    }

    private void writePodcastIds(Collection<String> podcastIds) throws Exception {
        sLogger.info(String.format("Writing podcast IDs to file %s", PODCAST_IDS_FILE));
        BufferedWriter writer = null;

        try {
            File file = new File(PODCAST_IDS_FILE);
            System.out.println(file.getCanonicalPath());
            writer = new BufferedWriter(new FileWriter(file));

            for (String podcastId : podcastIds) {
                writer.write(podcastId + "\n");
            }
        } catch (Exception e) {
            sLogger.error("Error writing podcast IDs file");
            throw e;
        } finally {
            ResourceUtility.closeResource(writer);
        }
    }

    private Collection<String> getPodcastIds(String subgenreUrl) {
        Set<String> podcastIds = new HashSet<>(SET_INIT_SIZE);
        long timeout = Long.parseLong(ContextManager.getInstance().getProperty("ID_PROCESS_TIMEOUT"));
        int urlsToProcess = Integer.parseInt(ContextManager.getInstance().getProperty("NUMBER_GENRE_URLS_TO_PROCESS"));
        sLogger.info(String.format("Getting podcast IDs for the subgenre URL: %s", subgenreUrl));

        try {
            // go through alphabet and get each page of links
            char letter = '@';
            int numberOfPages = -1;
            int currentPage = 1;
            int urlsProcessed = 0;

            while (true) {
                String pageUrl = subgenreUrl;

                if (letter == '*' || letter > '@') {
                    pageUrl += "&letter=" + letter;
                }

                if (currentPage > 1) {
                    pageUrl += "&page=" + currentPage;
                }
                sLogger.info(String.format("Connecting to %s", pageUrl));
                Document doc = Jsoup.connect(pageUrl).timeout(30000).get();

                // if we haven't parsed the pagination control yet, do it
                if (numberOfPages == -1) {
                    Elements paginate = doc.select("ul.paginate");

                    if (paginate != null && paginate.size() > 0) {
                        Elements pages = paginate.select("a[href]");
                        numberOfPages = pages.size() + 1;
                    } else {
                        numberOfPages = 2;
                    }
                }

                Elements links = doc.select("#selectedcontent").select("a[href]");

                if (links == null) {
                    sLogger.error(String.format(
                            "Podcast URLs were null for subgenre page URL: %s", pageUrl));
                    return podcastIds;
                }
                for (Element link : links) {
                    String url = link.attr("href");
                    Matcher matcher = mPattern.matcher(url);
                    String id = null;

                    if (matcher.find()) {
                        id = matcher.group(1);
                    }

                    if (id != null) {
                        sLogger.debug(String.format("Podcast ID: %s", id));
                        podcastIds.add(id);
                    }
                }
                Thread.sleep(timeout);

                // go to the next page, increment the letter to the next letter, *, or break out of the loop
                if (numberOfPages != -1 && currentPage < numberOfPages) {
                    currentPage++;
                } else if (letter == 'Z') {
                    letter = '*';
                    numberOfPages = -1;
                    currentPage = 1;
                } else if (letter == '*') {
                    break;
                } else {
                    letter++;
                    numberOfPages = -1;
                    currentPage = 1;
                }
                urlsProcessed++;

                if (urlsToProcess > 0 && urlsProcessed >= urlsToProcess) {
                    break;
                }
            }
            sLogger.info(String.format("Number of urls processed: %d", urlsProcessed));
        } catch (IOException e) {
            sLogger.error(e);
        } catch (InterruptedException e) {
            sLogger.error(e);
        }

        return podcastIds;
    }

    private List<String> getGenreUrls() throws Exception {
        List<String> genreUrls = new ArrayList<>();
        sLogger.info("Retrieving genre URLs...");

        try {
            sLogger.info(String.format("Connecting to %s", PODCAST_HOME_URL));
            Document doc = Jsoup.connect(PODCAST_HOME_URL).get();

            // get the sub genre lists
            Elements subgenres = doc.select("#genre-nav");

            if (subgenres == null) {
                throw new Exception("Null subgenres retrieved");
            }
            sLogger.info(String.format("Number of subgenres retrieved: %d", subgenres.size()));

            for (Element subgenre : subgenres) {
                Elements links = subgenre.select("a[href]");

                for (Element link : links) {
                    String url = link.attr("href");
                    sLogger.debug(String.format("URL: %s", url));
                    genreUrls.add(url);
                }
            }

        } catch (IOException e) {
            sLogger.error("Error retrieving iTunes Podcast home page");
            throw e;
        }
        return genreUrls;
    }
}