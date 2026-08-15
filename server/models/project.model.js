import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

const Project = sequelize.define(
  "Project",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    daily_budget_usd: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    rpm_limit: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    daily_token_limit: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    monthly_token_limit: {
      type: DataTypes.BIGINT,
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
    tableName: "projects",
    timestamps: false,
  }
);

export default Project;
