import "dotenv/config";
import bcrypt from "bcryptjs";
import sequelize from "../config/sql.js";
import User from "../models/user.model.js";

// One-off: resets a user's password directly in the DB when the original is lost.
// Usage: node server/scripts/reset-admin-password.js [email] [new_password]
const email = process.argv[2] || "admin@llmbreakr.local";
const newPassword = process.argv[3] || "admin";

const run = async () => {
  await sequelize.authenticate();

  const user = await User.findOne({ where: { email } });
  if (!user) {
    console.error(`no user found with email ${email}`);
    process.exit(1);
  }

  user.password_hash = await bcrypt.hash(newPassword, 10);
  await user.save();

  console.log(`password reset for ${email}`);
  await sequelize.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
