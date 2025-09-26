import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
  // Optionally, set a flag or fallback here
  redis.connected = false;
});

// Optionally, handle successful connection
redis.on("connect", () => {
  console.log("Connected to Redis");
  redis.connected = true;
});

export default redis;
