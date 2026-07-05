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
    prompt_tokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    completion_tokens: {
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
