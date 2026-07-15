import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

const VirtualKey = sequelize.define(
  "VirtualKey",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    key_hash: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    key_prefix: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    allowed_models: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rpm_limit: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    daily_budget_usd: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    approved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "virtual_keys",
    timestamps: false,
  }
);

export default VirtualKey;
