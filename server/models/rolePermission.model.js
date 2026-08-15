import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

const RolePermission = sequelize.define(
  "RolePermission",
  {
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    permission: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    tableName: "role_permissions",
    timestamps: false,
  }
);

export default RolePermission;
