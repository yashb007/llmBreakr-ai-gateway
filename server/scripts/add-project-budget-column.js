import "dotenv/config";
import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

// One-off: sequelize.sync() (config/client.js) only creates missing tables,
// it never alters existing ones, so a new column on an existing model has to
// be added by hand once. Safe to re-run — it checks first.
const run = async () => {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable("projects");

  if (table.daily_budget_usd) {
    console.log("projects.daily_budget_usd already exists — nothing to do");
  } else {
    await qi.addColumn("projects", "daily_budget_usd", { type: DataTypes.DOUBLE, allowNull: true });
    console.log("added projects.daily_budget_usd");
  }

  await sequelize.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
