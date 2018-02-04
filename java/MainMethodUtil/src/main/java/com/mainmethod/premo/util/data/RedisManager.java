package com.mainmethod.premo.util.data;

import com.mainmethod.premo.util.context.ContextManager;
import com.mainmethod.premo.util.resource.ResourceUtility;
import org.apache.log4j.Logger;
import redis.clients.jedis.*;

import java.util.List;
import java.util.Properties;

/**
 * Created by evan on 1/10/15.
 */
public class RedisManager {

    private static final Logger sLogger = Logger.getLogger(RedisManager.class.getSimpleName());
    public static final String PARSE_LIST       = "parse";
    public static final String EPISODE_LIST     = "episode";
    public static final String ERROR_LIST       = "error";
    public static final String CHANNEL_LIST     = "channel";
    public static final String PUSH_LIST        = "push";
    public static final String RETRIEVABLE_LIST = "retrievable";
    public static final String PUSH_REGISTRATION_DELETE_LIST = "push_registration_delete";

    private JedisPool mJedisPool;
    private int mTimeout;

    public RedisManager(Properties properties) {

        if (properties == null) {
            throw new IllegalArgumentException("Properties object cannot be null");
        }
        init(properties);
    }

    public RedisManager() {
        Properties properties = ContextManager.getInstance().getProperties();
        init(properties);
    }

    private void init(Properties properties) {
        sLogger.debug("Initializing");
        mTimeout = Integer.parseInt(properties.getProperty("REDIS_BLOCKING_TIME")) / 1000;
        mJedisPool = new JedisPool(new JedisPoolConfig(), properties.getProperty("REDIS_URL"));
    }

    public void destroy() {
        ResourceUtility.closeResource(mJedisPool);
    }

    public long size(String list) {
        sLogger.debug("Pushing item onto " + list);
        Jedis jedis = null;
        long size = -1;

        try {
            jedis = mJedisPool.getResource();
            size = jedis.llen(list);
            sLogger.debug("Size of " + list + " is " + size);
        } finally {
            ResourceUtility.closeResource(jedis);
        }
        return size;
    }

    public long push(String list, String item) {
        sLogger.debug("Pushing item onto " + list);
        Jedis jedis = null;
        long size = -1;

        try {
            jedis = mJedisPool.getResource();
            size = jedis.lpush(list, item);
            sLogger.debug("Size of " + list + " is " + size);
        } finally {
            ResourceUtility.closeResource(jedis);
        }
        return size;
    }

    public String pop(String list) {
        String value = null;
        Jedis jedis = null;

        try {
            jedis = mJedisPool.getResource();
            value = jedis.rpop(list);
        } finally {
            ResourceUtility.closeResource(jedis);
        }
        return value;
    }

    public String poll(String list) {
        String value = null;
        Jedis jedis = null;

        try {
            jedis = mJedisPool.getResource();
            List<String> values = jedis.brpop(mTimeout, list);

            // the value is the 2nd element (1) because it's a key value pair
            if (values != null && values.size() == 2) {
                value = values.get(1);
            }
        } finally {
            ResourceUtility.closeResource(jedis);
        }
        return value;
    }

    public List<String> pop(String list, int number) {
        List<String> values = null;
        Jedis jedis = null;
        Transaction transaction = null;

        try {
            jedis = mJedisPool.getResource();
            transaction = jedis.multi();
            Response<List<String>> rangeResponse = transaction.lrange(list, 0, number);
            Response<String> response = transaction.ltrim(list, number, -1);
            transaction.exec();
            values = rangeResponse.get();
        } finally {
            ResourceUtility.closeResource(jedis);
        }
        return values;
    }
}
