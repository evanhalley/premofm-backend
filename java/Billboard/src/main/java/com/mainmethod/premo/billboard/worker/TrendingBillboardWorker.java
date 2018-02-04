package com.mainmethod.premo.billboard.worker;

import com.mainmethod.premo.billboard.Score;
import com.mainmethod.premo.billboard.data.DatabaseManager;
import com.mainmethod.premo.billboard.data.PerformanceType;
import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.object.ActionType;
import org.apache.log4j.Logger;

import java.util.*;

/**
 * Updates trending rank on the Billboard sub document
 * Created by evan on 6/9/15.
 */
public class TrendingBillboardWorker implements Runnable {

    private static final Logger sLogger = Logger.getLogger(TrendingBillboardWorker.class.getSimpleName());

    private final DatabaseManager mDatabaseManager;

    public TrendingBillboardWorker(DatabaseManager databaseManager) {
        mDatabaseManager = databaseManager;
    }

    @Override
    public void run() {

        sLogger.info("Building channel billboard");
        calculateChannelBillboard();

        sLogger.info("Building episode billboard");
        calculateEpisodeBillboard();

        sLogger.info("Building collection billboard");
        calculateCollectionBillboard();

        sLogger.info("Finished!");
    }

    private void calculateCollectionBillboard() {
        Map<String, Score> scoresMap = new HashMap<>();

        // load metrics from the database
        sLogger.info("Loading action metrics from the database...");
        HashSet<Score> byEpisodeListens =
                mDatabaseManager.getPerformanceRankedByActionType(ActionType.COLLECTION_ADD, PerformanceType.COLLECTION);

        // adjust each score by it's weight
        sLogger.info("Calculating scores...");
        calculatedWeightedScores(scoresMap, byEpisodeListens, 1.0f);

        // sort the scores
        sLogger.info("Sorting scores...");
        List<Score> scores = sortScores(scoresMap);

        // remove existing rankings
        sLogger.info("Resetting collections trending billboard...");
        mDatabaseManager.resetTrendingRankBillboard(PerformanceType.COLLECTION);

        // store the scores
        sLogger.info("Updating collections trending billboard...");
        mDatabaseManager.updateEpisodeTrendingBillboard(scores);
    }

    private void calculateEpisodeBillboard() {
        Map<String, Score> scoresMap = new HashMap<>();

        // load metrics from the database
        sLogger.info("Loading action metrics from the database...");
        HashSet<Score> byEpisodeListens =
                mDatabaseManager.getPerformanceRankedByActionType(ActionType.EPISODE_LISTEN, PerformanceType.EPISODE);

        // adjust each score by it's weight
        sLogger.info("Calculating scores...");
        calculatedWeightedScores(scoresMap, byEpisodeListens, 1.0f);

        // sort the scores
        sLogger.info("Sorting scores...");
        List<Score> scores = sortScores(scoresMap);

        // remove existing rankings
        sLogger.info("Resetting episodes trending billboard...");
        mDatabaseManager.resetTrendingRankBillboard(PerformanceType.EPISODE);

        // store the scores
        sLogger.info("Updating episodes trending billboard...");
        mDatabaseManager.updateEpisodeTrendingBillboard(scores);
    }

    private void calculateChannelBillboard() {
        Map<String, Score> scoresMap = new HashMap<>();

        // load metrics from the database
        sLogger.info("Loading action metrics from the database...");
        HashSet<Score> byEpisodeFavorites =
                mDatabaseManager.getPerformanceRankedByActionType(ActionType.EPISODE_FAVORITE, PerformanceType.CHANNEL);
        HashSet<Score> byEpisodeListens =
                mDatabaseManager.getPerformanceRankedByActionType(ActionType.EPISODE_LISTEN, PerformanceType.CHANNEL);
        HashSet<Score> byChannelSubscribes =
                mDatabaseManager.getPerformanceRankedByActionType(ActionType.CHANNEL_SUBSCRIBE, PerformanceType.CHANNEL);

        // load weights
        sLogger.info("Loading scoring weights...");
        float weightChannelSubscribes = Float.parseFloat(ContextManager.getInstance().getProperty("CHANNEL_SUBSCRIBES"));
        float weightEpisodeListens = Float.parseFloat(ContextManager.getInstance().getProperty("EPISODE_LISTENS"));
        float weightEpisodeFavorites = Float.parseFloat(ContextManager.getInstance().getProperty("EPISODE_FAVORITES"));

        // adjust each score by it's weight
        sLogger.info("Calculating scores...");
        calculatedWeightedScores(scoresMap, byEpisodeFavorites, weightEpisodeFavorites);
        calculatedWeightedScores(scoresMap, byEpisodeListens, weightEpisodeListens);
        calculatedWeightedScores(scoresMap, byChannelSubscribes, weightChannelSubscribes);

        // sort the scores
        sLogger.info("Sorting scores...");
        List<Score> scores = sortScores(scoresMap);

        // remove existing rankings
        sLogger.info("Resetting channels trending billboard...");
        mDatabaseManager.resetTrendingRankBillboard(PerformanceType.CHANNEL);

        // store the scores
        sLogger.info("Updating channels trending billboard...");
        mDatabaseManager.updateChannelTrendingBillboard(scores);
    }

    /**
     *
     * @param existingScores
     * @param newScores
     * @param weight
     */
    private void calculatedWeightedScores(Map<String, Score> existingScores, Set<Score> newScores, float weight) {

        for (Score score : newScores) {
            float scoreVal = score.getScore() * weight;

            if (existingScores.containsKey(score.getId())) {
                // score is in the map, let's add the score to it
                Score temp = existingScores.get(score.getId());
                temp.setScore(score.getScore() + scoreVal);
            } else {
                // score isn't in the map, let's add it
                score.setScore(scoreVal);
                existingScores.put(score.getId(), score);
            }
        }
    }

    /**
     *
     * @param unsortedScores
     * @return
     */
    private List<Score> sortScores(Map<String, Score> unsortedScores) {
        List<Score> scores = new ArrayList<>(unsortedScores.values().size());

        for (String channelId : unsortedScores.keySet()) {
            Score score = unsortedScores.get(channelId);

            // let's insert scores into the scores list in descending order by score

            // scores list is empty, insert at the first entry
            if (scores.size() == 0) {
                scores.add(score);
            }

            // scores has some values, lets iterate and find a spot to insert
            else {
                int insertIndex = -1;

                for (int i = 0; i < scores.size(); i++) {
                    Score temp = scores.get(i);

                    // the score we are going to insert, is greater than the score at this index, insert at this index
                    if (score.getScore() > temp.getScore()) {
                        insertIndex = i;
                        break;
                    }
                }

                // insertIndex is not -1 so we we found a place for an insert
                if (insertIndex != -1) {
                    scores.add(insertIndex, score);
                }

                // insert index is -1, so we didn't find a place for it, insert it at the end
                else {
                    scores.add(score);
                }
            }
        }
        return scores;
    }
}