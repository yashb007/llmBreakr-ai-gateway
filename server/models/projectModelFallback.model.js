import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

// An ordered fallback chain: when primary_project_model_id fails at its
// provider (outage, rate limit, bad credential — see dataplane's
// resolveFallback), chat.service.js tries fallback_project_model_id next,
// in ascending priority order. Both sides point at project_models, not the
// raw provider catalog, so a fallback can only ever be a model the project
// has already been explicitly granted — credential resolution for it works
// exactly like any other request.
const ProjectModelFallback = sequelize.define(
  "ProjectModelFallback",
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
    primary_project_model_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fallback_project_model_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: "project_model_fallbacks",
    timestamps: false,
    indexes: [
      // Explicit short names — Sequelize's auto-generated
      // "table_col1_col2..." name exceeds MySQL's 64-char identifier limit
      // for a table+column combo this long.
      { name: "pmf_primary_fallback_unique", unique: true, fields: ["primary_project_model_id", "fallback_project_model_id"] },
      { name: "pmf_project_id_idx", fields: ["project_id"] },
    ],
  }
);

export default ProjectModelFallback;
