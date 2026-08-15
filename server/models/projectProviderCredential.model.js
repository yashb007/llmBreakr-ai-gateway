import { DataTypes } from "sequelize";
import sequelize from "../config/sql.js";

// A project's credential for one provider — at most one row per
// (project_id, provider), enforced by the unique index below. `provider` is
// a denormalized copy of provider_credentials.provider at assignment time:
// the uniqueness rule needs to be enforced across a joined column, which
// MySQL/Sequelize can't express directly, so it's copied onto this row instead.
const ProjectProviderCredential = sequelize.define(
  "ProjectProviderCredential",
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
    provider_credential_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING,
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
    tableName: "project_provider_credentials",
    timestamps: false,
    indexes: [{ unique: true, fields: ["project_id", "provider"] }],
  }
);

export default ProjectProviderCredential;
