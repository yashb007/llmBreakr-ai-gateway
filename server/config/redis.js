import { createClient } from "redis";
import { redis } from "./vars.js";

const redisClient = createClient({
  socket: {
    host: redis.host,
    port: redis.port,
  },
});

redisClient.on("error", (err) => console.error("Redis client error", err));

export default redisClient;
