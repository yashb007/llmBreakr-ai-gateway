import "dotenv/config";
import { DataTypes, QueryTypes } from "sequelize";
import sequelize from "../config/sql.js";

// One-off: replaces provider_models' flat prompt/completion-per-1K pricing
// with four categories (input, output, cache write, cache read), all priced
// per 1M tokens to match how providers publish rates. Old per-1K values are
// preserved by converting forward (price_per_1k * 1000 = price_per_million)
// before the old columns are dropped — non-lossy, not a throwaway migration.
// Also adds cache_write_tokens/cache_read_tokens to request_logs so cost can
// be recomputed later without re-hitting the provider. Safe to re-run.
const run = async () => {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();

  // 1. provider_models: add the four new columns, nullable for now.
  const pmTable = await qi.describeTable("provider_models");
  const newPricingCols = {
    input_price_per_million: pmTable.input_price_per_million,
    output_price_per_million: pmTable.output_price_per_million,
    cache_write_price_per_million: pmTable.cache_write_price_per_million,
    cache_read_price_per_million: pmTable.cache_read_price_per_million,
  };
  for (const col of Object.keys(newPricingCols)) {
    if (!newPricingCols[col]) {
      await qi.addColumn("provider_models", col, { type: DataTypes.DOUBLE, allowNull: true });
      console.log(`added provider_models.${col}`);
    }
  }

  // 2. Backfill input/output from the old per-1K columns (raw query — the
  // ORM model no longer declares prompt_price_per_1k/completion_price_per_1k).
  if (pmTable.prompt_price_per_1k) {
    const rows = await sequelize.query(
      "SELECT id, prompt_price_per_1k, completion_price_per_1k FROM provider_models " +
        "WHERE prompt_price_per_1k IS NOT NULL OR completion_price_per_1k IS NOT NULL",
      { type: QueryTypes.SELECT }
    );
    for (const row of rows) {
      await sequelize.query(
        "UPDATE provider_models SET input_price_per_million = ?, output_price_per_million = ? WHERE id = ?",
        {
          replacements: [
            row.prompt_price_per_1k != null ? row.prompt_price_per_1k * 1000 : null,
            row.completion_price_per_1k != null ? row.completion_price_per_1k * 1000 : null,
            row.id,
          ],
        }
      );
    }
    console.log(`backfilled input/output pricing for ${rows.length} model(s)`);

    await qi.removeColumn("provider_models", "prompt_price_per_1k");
    await qi.removeColumn("provider_models", "completion_price_per_1k");
    console.log("dropped provider_models.prompt_price_per_1k / completion_price_per_1k");
  } else {
    console.log("provider_models.prompt_price_per_1k already gone — skipping backfill");
  }

  // 3. request_logs: add cache token columns.
  const rlTable = await qi.describeTable("request_logs");
  if (!rlTable.cache_write_tokens) {
    await qi.addColumn("request_logs", "cache_write_tokens", { type: DataTypes.INTEGER, allowNull: true });
    console.log("added request_logs.cache_write_tokens");
  }
  if (!rlTable.cache_read_tokens) {
    await qi.addColumn("request_logs", "cache_read_tokens", { type: DataTypes.INTEGER, allowNull: true });
    console.log("added request_logs.cache_read_tokens");
  }

  await sequelize.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
