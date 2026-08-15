import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

const ProviderCredential = sequelize.define(
  "ProviderCredential",
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
     description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    encrypted_key: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    tableName: "provider_credentials",
    timestamps: false,
  }
);

export default ProviderCredential;
