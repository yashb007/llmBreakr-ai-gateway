import "dotenv/config";
import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

// One-off: sequelize.sync() (config/client.js) only creates missing tables,
// it never alters existing ones. Safe to re-run — checks first.
const COLUMNS = ["daily_token_limit", "monthly_token_limit"];

const addMissingColumns = async (qi, tableName) => {
  const table = await qi.describeTable(tableName);
  for (const column of COLUMNS) {
    if (table[column]) {
      console.log(`${tableName}.${column} already exists — nothing to do`);
    } else {
      await qi.addColumn(tableName, column, { type: DataTypes.BIGINT, allowNull: true });
      console.log(`added ${tableName}.${column}`);
    }
  }
};

const run = async () => {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();

  await addMissingColumns(qi, "projects");
  await addMissingColumns(qi, "virtual_keys");

  await sequelize.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
