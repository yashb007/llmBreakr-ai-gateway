import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

// A model a project is allowed to call — the sole allowlist gate at request
// time (dataplane/middlewares/resolveModel.js): no row here means no access,
// regardless of what's in the shared provider_models catalog.
const ProjectModel = sequelize.define(
  "ProjectModel",
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
    provider_model_id: {
      type: DataTypes.INTEGER,
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
    tableName: "project_models",
    timestamps: false,
    indexes: [{ unique: true, fields: ["project_id", "provider_model_id"] }],
  }
);

export default ProjectModel;
