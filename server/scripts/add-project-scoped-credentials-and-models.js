import "dotenv/config";
import sequelize from "../config/sql.js";
import "../models/index.js"; // wires up associations (needed before sync() so new tables get their FKs)

// One-off: creates project_provider_credentials and project_models —
// replaces the old models/proxy_model_fallbacks (per-credential routing)
// design with project-scoped credential + model allowlists. Additive only:
// doesn't touch or drop anything from the old schema (see
// drop-legacy-model-routing.js for that, run separately once the new path
// is verified). Safe to re-run — sync() only creates missing tables, and
// addConstraintIfMissing skips constraints that already exist.
const addConstraintIfMissing = async (qi, table, options) => {
  try {
    await qi.addConstraint(table, options);
    console.log(`added constraint ${options.name}`);
  } catch (error) {
    if (/duplicate|already exists/i.test(error.message)) {
      console.log(`${options.name} already exists — nothing to do`);
    } else {
      throw error;
    }
  }
};

const run = async () => {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();

  await sequelize.sync();
  console.log("ensured project_provider_credentials / project_models tables exist");

  await addConstraintIfMissing(qi, "project_provider_credentials", {
    fields: ["project_id"],
    type: "foreign key",
    name: "project_provider_credentials_project_id_fkey",
    references: { table: "projects", field: "id" },
    onDelete: "CASCADE",
  });
  await addConstraintIfMissing(qi, "project_provider_credentials", {
    fields: ["provider_credential_id"],
    type: "foreign key",
    name: "project_provider_credentials_provider_credential_id_fkey",
    references: { table: "provider_credentials", field: "id" },
    onDelete: "RESTRICT",
  });

  await addConstraintIfMissing(qi, "project_models", {
    fields: ["project_id"],
    type: "foreign key",
    name: "project_models_project_id_fkey",
    references: { table: "projects", field: "id" },
    onDelete: "CASCADE",
  });
  await addConstraintIfMissing(qi, "project_models", {
    fields: ["provider_model_id"],
    type: "foreign key",
    name: "project_models_provider_model_id_fkey",
    references: { table: "provider_models", field: "id" },
    onDelete: "RESTRICT",
  });

  console.log(
    "NOTE: no data was backfilled — there's no prior project<->credential mapping to derive it from. " +
      "Every existing project needs credentials/models attached manually via the new admin UI before it can serve requests."
  );

  await sequelize.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
