const { createClient } = require('redis');

let redisClient = null;

const connectRedis = async () => {
  // Redis is optional — if REDIS_URL is not set, presence falls back to in-memory
  if (!process.env.REDIS_URL) {
    console.log('REDIS_URL not set. Running without Redis (single-instance mode).');
    return null;
  }

  try {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => console.error('Redis error:', err.message));
    await redisClient.connect();
    console.log('Redis connected.');
    return redisClient;
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    return null;
  }
};

const getRedis = () => redisClient;

module.exports = { connectRedis, getRedis };
