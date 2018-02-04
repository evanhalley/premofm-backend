package com.mainmethod.premo.util;

import com.mainmethod.premo.util.date.DateParser;
import org.junit.Test;

import java.time.LocalDateTime;
import java.util.Date;

import static org.junit.Assert.*;

/**
 * Created by evan on 11/5/14.
 */
public class DateParserTest {

    @Test
    public void testParseDate() {
        String datetime = LocalDateTime.of(2000, 01, 01, 00, 00, 00).toString();
        assertEquals(datetime, new DateParser().parseDate("Sat, 1 Jan 2000 00:00 +0000").toString());
        assertEquals(datetime, new DateParser().parseDate("Sat, 1 Jan 2000 00:00 GMT").toString());
        assertEquals(datetime, new DateParser().parseDate("Sat, 1 Jan 2000 00:00:00 +0000").toString());
        assertEquals(datetime, new DateParser().parseDate("Sat, 1 Jan 2000 00:00:00 GMT").toString());
        assertEquals(datetime, new DateParser().parseDate("Sat, 01 Jan 2000 00:00:00 +0000").toString());
    }

    @Test
    public void testConvertTwoSegmentTimeToThreeSegmentTime() {
        assertEquals("00:00:00", DateParser.ensureSegmentedDuration("00:00"));
        assertEquals("02:00:00", DateParser.ensureSegmentedDuration("120:00"));
        assertEquals("02:02:00", DateParser.ensureSegmentedDuration("122:00"));
        assertEquals("01:00:00", DateParser.ensureSegmentedDuration("60:00"));
        assertEquals("01:00:00", DateParser.ensureSegmentedDuration("01:00:00"));
        assertEquals("02:01:00", DateParser.ensureSegmentedDuration("01:60:60"));
    }

    @Test
    public void testDurationParser() {
        assertEquals(3600000, DateParser.parseDuration("1:00:00"));
        assertEquals(3300000, DateParser.parseDuration("55:00"));
        assertEquals(7560000, DateParser.parseDuration("126:00"));
        assertEquals(37000, DateParser.parseDuration("00:00:37"));
        assertEquals(60000, DateParser.parseDuration("00:01:00"));
        assertEquals(18001000, DateParser.parseDuration("05:00:01"));
    }

    @Test
    public void testParseDurationFromSeconds() {
        String date1 = "Thu, 1 Jan 1970 00:00 +0000";
        DateParser parser = new DateParser();
        LocalDateTime date = parser.parseDate(date1);
        assertEquals(1970, date.getYear());
    }

    @Test
    public void testConvertLocalDateTimeToDate() {
        Date date = DateParser.convertLocalDateTimeToDate(LocalDateTime.of(1970, 1, 1, 0, 0));
        long time = date.getTime();
        assertEquals(0, date.getTime());
    }
}
