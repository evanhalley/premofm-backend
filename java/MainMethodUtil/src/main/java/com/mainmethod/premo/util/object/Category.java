package com.mainmethod.premo.util.object;

/**
 * Created by evan on 6/9/15.
 */
public enum Category {

    ART(1, "Art"),
    BUSINESS(2, "Business"),
    COMEDY(3, "Comdey"),
    EDUCATION(4, "Education"),
    GAMES_AND_HOBBIES(5, "Games & Hobbies"),
    GOVERNMENTS_AND_ORGANIZATIONS(6, "Governments & Organizations"),
    HEALTH(7, "Health"),
    KIDS_AND_FAMILY(8, "Kids & Family"),
    MUSIC(9, "Music"),
    NEWS_AND_POLITICS(10, "News & Politics"),
    RELIGION_AND_SPIRITUALITY(11, "Religion & Spirituality"),
    SCIENCE_AND_MEDICINE(12, "Science & Medicine"),
    SOCIETY_AND_CULTURE(13, "Society & Culture"),
    SPORTS_AND_RECREATION(14, "Sports & Recreation"),
    TV_AND_FILM(15, "TV & Film"),
    TECHNOLOGY(16, "Technology");

    int mId;
    String mCategory;

    Category(int id, String category) {
        mId = id;
        mCategory = category;
    }

    public String getCategory() {
        return mCategory;
    }

    public int getId() {
        return mId;
    }
}
