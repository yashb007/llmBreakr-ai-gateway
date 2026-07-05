import sequelize from "./sql.js";
import redisClient from "./redis.js";
import "../models/index.js";
import { seedSuperAdmin } from "../models/seed.js";

export const connectClients = async () => {
  await sequelize.authenticate();
  console.info("mysql connection established");

  await sequelize.sync();
  console.info("database tables synced");

  await seedSuperAdmin();

//   await redisClient.connect();
//   console.info("redis connection established");
};

export { sequelize, redisClient };
