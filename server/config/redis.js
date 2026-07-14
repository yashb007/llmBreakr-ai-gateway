import { createClient } from "redis";
import { redis } from "./vars.js";

const redisClient = createClient({
  url: redis.host,
});

redisClient.on("error", (err) => console.error("Redis client error", err));

export default redisClient;
