import "dotenv/config";
import sequelize from "../config/sql.js";

// DESTRUCTIVE — do not run until the project-scoped credential/model path
// (add-project-scoped-credentials-and-models.js) has been verified end to
// end. Drops the old per-credential model routing entirely: virtual_keys
// stops carrying its own allowed_models list (project_models is now the only
// allowlist), and the old models/proxy_model_fallbacks tables (superseded by
// project_provider_credentials + project_models) are removed. Not
// idempotent in the usual sense — reruns are harmless no-ops once the
// targets are already gone, but there's no undo once they're dropped.
const run = async () => {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();

  const virtualKeysTable = await qi.describeTable("virtual_keys");
  if (virtualKeysTable.allowed_models) {
    await qi.removeColumn("virtual_keys", "allowed_models");
    console.log("dropped virtual_keys.allowed_models");
  } else {
    console.log("virtual_keys.allowed_models already gone");
  }

  const tables = await qi.showAllTables();
  if (tables.includes("proxy_model_fallbacks")) {
    await qi.dropTable("proxy_model_fallbacks");
    console.log("dropped proxy_model_fallbacks");
  } else {
    console.log("proxy_model_fallbacks already gone");
  }

  if (tables.includes("models")) {
    await qi.dropTable("models");
    console.log("dropped models");
  } else {
    console.log("models already gone");
  }

  await sequelize.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
