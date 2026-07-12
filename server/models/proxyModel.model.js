import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

const ProxyModel = sequelize.define(
  "ProxyModel",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    model_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    provider_params: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    blocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: "models",
    timestamps: false,
  }
);

export default ProxyModel;
