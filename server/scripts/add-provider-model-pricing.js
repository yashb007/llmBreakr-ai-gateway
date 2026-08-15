import "dotenv/config";
import { DataTypes, QueryTypes } from "sequelize";
import sequelize from "../config/sql.js";

// One-off: adds input/output/cache_write/cache_read _price_per_million to
// provider_models (idempotent — safe to re-run on a fresh DB where the
// migrate-per-million-cache-pricing.js schema change hasn't run yet) and
// seeds known models from published rates. Cache pricing is left null here —
// set it per model via the admin UI once you know which of your models
// actually see cache traffic, rather than guessing a rate.
const KNOWN_RATES = {
  "gpt-4o": { input: 5, output: 15 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "claude-opus-4-5": { input: 15, output: 75 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "gemini-2.5-pro": { input: 1.25, output: 5 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
};

const run = async () => {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable("provider_models");

  for (const col of [
    "input_price_per_million",
    "output_price_per_million",
    "cache_write_price_per_million",
    "cache_read_price_per_million",
  ]) {
    if (!table[col]) {
      await qi.addColumn("provider_models", col, { type: DataTypes.DOUBLE, allowNull: true });
      console.log(`added provider_models.${col}`);
    } else {
      console.log(`provider_models.${col} already exists — skipping`);
    }
  }

  let seeded = 0;
  for (const [modelId, rates] of Object.entries(KNOWN_RATES)) {
    const [existing] = await sequelize.query(
      "SELECT id, input_price_per_million FROM provider_models WHERE model_id = ?",
      { replacements: [modelId], type: QueryTypes.SELECT }
    );
    if (!existing) continue; // this DB never synced/registered that model — nothing to seed
    if (existing.input_price_per_million !== null) continue; // don't clobber a price an admin already set

    await sequelize.query(
      "UPDATE provider_models SET input_price_per_million = ?, output_price_per_million = ? WHERE id = ?",
      { replacements: [rates.input, rates.output, existing.id] }
    );
    seeded++;
  }
  console.log(`seeded pricing for ${seeded} known model(s)`);

  await sequelize.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
