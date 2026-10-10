import fs from "node:fs";
import path from "node:path";
import { Sequelize } from "sequelize";
import { db } from "./vars.js";

let sequelize;

if (db.dialect === "sqlite") {
  // sqlite3 doesn't create the parent directory for the storage file itself.
  fs.mkdirSync(path.dirname(db.storage), { recursive: true });

  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: db.storage,
    logging: false,
  });
} else {
  sequelize = new Sequelize(db.name, db.user, db.password, {
    host: db.host,
    port: db.port,
    dialect: db.dialect,
    logging: false,
  });
}

export default sequelize;
