import "dotenv/config";
import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

// One-off: sequelize.sync() (config/client.js) only creates missing tables,
// it never alters existing ones. Safe to re-run — checks first.
const run = async () => {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable("request_logs");

  if (table.requested_model) {
    console.log("request_logs.requested_model already exists — nothing to do");
  } else {
    await qi.addColumn("request_logs", "requested_model", { type: DataTypes.STRING, allowNull: true });
    console.log("added request_logs.requested_model");
  }

  if (table.fallback_attempt) {
    console.log("request_logs.fallback_attempt already exists — nothing to do");
  } else {
    await qi.addColumn("request_logs", "fallback_attempt", { type: DataTypes.INTEGER, allowNull: true });
    console.log("added request_logs.fallback_attempt");
  }

  await sequelize.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
