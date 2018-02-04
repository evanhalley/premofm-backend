package com.mainmethod.premo.util.date;

import org.apache.log4j.Logger;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Date;

/**
 * Created by evan on 11/5/14.
 */
public class DateParser {

    private static final Logger sLogger = Logger.getLogger(DateParser.class.getSimpleName());

    private DateTimeFormatter mDateTimeFormatter;

    public DateParser() {

    }

    private void initFormatter(String sampleDate) {

        for (int i = 0; i < DateFormat.FORMATS.length; i++) {

            try {
                mDateTimeFormatter = DateTimeFormatter.ofPattern(DateFormat.FORMATS[i]);
                mDateTimeFormatter.parse(sampleDate);
                break;
            } catch (Exception e) {
                sLogger.debug("Pattern doesn't match pattern: " + DateFormat.FORMATS[i]);
                mDateTimeFormatter = null;
            }
        }

        if (mDateTimeFormatter == null) {
            sLogger.warn(String.format("Unable to parse dates that look like: %s", sampleDate));
        }
    }

    /**
     * Parses a string date into a Java Date object
     * @param dateStr
     * @return
     */
    public LocalDateTime parseDate(String dateStr) {
        return parseDate(dateStr, true);
    }

    /**
     * Parses a string date into a Java Date object
     * @param dateStr
     * @return
     */
    private LocalDateTime parseDate(String dateStr, boolean tryAgain) {
        LocalDateTime date = LocalDateTime.now(ZoneId.of("GMT"));

        if (mDateTimeFormatter == null) {
            initFormatter(dateStr);
        }

        if (mDateTimeFormatter != null) {

            try {
                date = LocalDateTime.parse(dateStr, mDateTimeFormatter);
            } catch (DateTimeParseException e) {
                sLogger.debug(String.format("ParseException parsing date: %s", dateStr));

                if (tryAgain) {
                    sLogger.debug("ParseException encountered, re-initializing the date parser");
                    mDateTimeFormatter = null;
                    parseDate(dateStr, false);
                }
            }
        }
        return date;
    }

    /**
     * Parses a duration string into milliseconds
     * @param durationStr
     * @return
     */
    public static long parseDuration(String durationStr) {
        long duration = -1;
        String[] componentArr = durationStr.split(":");

        switch (componentArr.length) {
            case 1:
                duration = parseDurationFromSeconds(durationStr);
                break;
            case 2:
            case 3:
                durationStr = ensureSegmentedDuration(durationStr);
                duration = parseDurationFromString("HH:mm:ss", durationStr);
                break;
            default:
                break;
        }

        return duration;
    }

    public static String sanitizeDuration(String durationStr) {
        StringBuilder builder = new StringBuilder();
        String[] componentArr = durationStr.split(":");

        for (int i = 0; i < componentArr.length; i++) {
            builder.append(String.format("%02d", Integer.parseInt(componentArr[i])));

            if (i < componentArr.length - 1) {
                builder.append(":");
            }
        }
        return builder.toString();
    }

    public static String ensureSegmentedDuration(String timeStr) {

        if (timeStr == null) {
            throw new IllegalArgumentException("Input is null");
        }

        String[] componentArr = timeStr.split(":");
        int hour;
        int min;
        int sec;

        switch (componentArr.length) {
            case 2:
                hour = 0;
                min = Integer.parseInt(componentArr[0].trim());
                sec = Integer.parseInt(componentArr[1].trim());
                break;
            case 3:
                hour = Integer.parseInt(componentArr[0].trim());
                min = Integer.parseInt(componentArr[1].trim());
                sec = Integer.parseInt(componentArr[2].trim());
                break;
            default:
                throw new IllegalArgumentException("Input contains an incorrect number of segments");
        }

        if (sec >= 60) {
            min += sec / 60;
            sec = sec % 60;
        }

        if (min >= 60) {
            hour += min / 60;
            min = min % 60;
        }
        return String.format("%02d:%02d:%02d", hour, min, sec);
    }

    /**
     * Parses the length of the episode in milliseonds from a string resembling ssss
     * @param durationSeconds
     * @return
     */
    private static long parseDurationFromSeconds(String durationSeconds) {
        long duration = 0;

        try {
            duration = Long.parseLong(durationSeconds);
            duration = duration * 1_000;
        } catch (NumberFormatException e) {
            sLogger.warn("Error in parseDuration");
            sLogger.warn(e.getMessage());
        }
        return duration;
    }

    /**
     * Parses the length of the episode in milliseconds from a string resembling HH:mm:ss or mm:ss
     * @param format
     * @param durationStr
     * @return
     */
    private static long parseDurationFromString(String format, String durationStr) {
        long duration = 0;
        durationStr = sanitizeDuration(durationStr);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern(format);

        try {
            LocalTime dt = LocalTime.parse(durationStr, formatter);
            duration = dt.toSecondOfDay() * 1_000;
        } catch (DateTimeParseException e) {
            sLogger.debug("Unable to parse a duration", e);
        }
        return duration;
    }

    public static Date convertLocalDateTimeToDate(LocalDateTime localDateTime) {
        return Date.from(localDateTime.atZone(ZoneId.of("UTC")).toInstant());
    }

    public static Date now() {
        return Date.from(LocalDateTime.now(ZoneId.of("UTC")).toInstant(ZoneOffset.UTC));
    }
}
