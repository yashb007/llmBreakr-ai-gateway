import { createClient } from "redis";
import { redis } from "./vars.js";

const redisClient = createClient({
  url: redis.host,
  // Plain dual-stack DNS lookup fails on this network even though an IPv4
  // (A) record exists — forcing IPv4 resolution avoids the broken IPv6 path.
  socket: { family: 4 },
});

redisClient.on("error", (err) => console.error("Redis client error", err));

export default redisClient;
