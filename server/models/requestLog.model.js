import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

const RequestLog = sequelize.define(
  "RequestLog",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ts: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    virtual_key_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Set only when a fallback actually fired and this differs from `model`
    // above (which always holds whichever model actually served the
    // request) — null on every ordinary, non-fallback request.
    requested_model: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // 0 = served by the primary model, 1 = first fallback, 2 = second, etc.
    // Null when fallback never applied (no chain configured, or the failure
    // wasn't fallback-eligible).
    fallback_attempt: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    prompt_tokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    completion_tokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cache_write_tokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cache_read_tokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    latency_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cached: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    blocked_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "request_logs",
    timestamps: false,
    indexes: [{ fields: ["ts"] }, { fields: ["virtual_key_id"] }],
  }
);

export default RequestLog;
