import "dotenv/config";
import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

// One-off: sequelize.sync() (config/client.js) only creates missing tables,
// it never alters existing ones. Safe to re-run — checks first.
const run = async () => {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable("projects");

  if (table.rpm_limit) {
    console.log("projects.rpm_limit already exists — nothing to do");
  } else {
    await qi.addColumn("projects", "rpm_limit", { type: DataTypes.INTEGER, allowNull: true });
    console.log("added projects.rpm_limit");
  }

  await sequelize.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
