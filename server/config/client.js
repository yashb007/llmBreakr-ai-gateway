import sequelize from "./sql.js";
import redisClient, { backend as cacheBackend } from "./redis.js";
import "../models/index.js";
import { seedSuperAdmin } from "../models/seed.js";

export const connectClients = async () => {
  await sequelize.authenticate();
  console.info(`${sequelize.getDialect()} connection established`);

  await sequelize.sync();
  console.info("database tables synced");

  await seedSuperAdmin();

  await redisClient.connect();
  console.info(cacheBackend === "redis" ? "redis connection established" : "in-memory cache ready (no REDIS_HOST set)");
};

export { sequelize, redisClient };
