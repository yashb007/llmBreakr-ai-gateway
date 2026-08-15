import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

// The catalog of raw models a provider exposes, independent of any one
// credential — e.g. ("openai", "gpt-4o") exists exactly once here no matter
// how many OpenAI credentials sync it. project_models rows (projectModel.model.js)
// point at these to grant a project access to a specific (provider, raw model) pair.
const ProviderModel = sequelize.define(
  "ProviderModel",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // USD per 1M tokens. No provider exposes pricing via their models API
    // (verified against OpenAI/Anthropic/Gemini directly), so this is
    // admin-maintained: null until set, in which case that category costs $0
    // (see utils/pricing.js) rather than erroring. cache_write only applies
    // to Anthropic today (prompt caching write) — OpenAI/Gemini cache reads
    // are automatic with no separate write charge, so it's always $0 for them.
    input_price_per_million: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    output_price_per_million: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    cache_write_price_per_million: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    cache_read_price_per_million: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "provider_models",
    timestamps: false,
    indexes: [{ unique: true, fields: ["provider", "model_id"] }],
  }
);

export default ProviderModel;
