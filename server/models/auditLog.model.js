import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

const AuditLog = sequelize.define(
  "AuditLog",
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
    actor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actor_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    actor_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    resource_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resource_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "success",
    },
  },
  {
    tableName: "audit_logs",
    timestamps: false,
    indexes: [
      { fields: ["ts"] },
      { fields: ["actor_id"] },
      { fields: ["resource_type", "resource_id"] },
      { fields: ["action"] },
    ],
  }
);

export default AuditLog;
