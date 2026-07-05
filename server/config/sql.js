import { Sequelize } from "sequelize";
import { db } from "./vars.js";

const sequelize = new Sequelize(db.name, db.user, db.password, {
  host: db.host,
  port: db.port,
  dialect: db.dialect,
  logging: false,
});

export default sequelize;
