import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

const Session = sequelize.define(
  "Session",
  {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "sessions",
    timestamps: false,
  }
);

export default Session;
