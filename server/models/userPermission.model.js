import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

// Per-user permission override, layered on top of role-derived permissions.
// effect: "grant" adds a permission the user's roles don't already give them;
// "deny" removes a permission even if one of their roles grants it.
const UserPermission = sequelize.define(
  "UserPermission",
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    permission: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    effect: {
      type: DataTypes.ENUM("grant", "deny"),
      allowNull: false,
      defaultValue: "grant",
    },
    granted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    granted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "user_permissions",
    timestamps: false,
  }
);

export default UserPermission;
