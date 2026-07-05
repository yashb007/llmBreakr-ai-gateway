import bcrypt from "bcryptjs";
import User from "./user.model.js";
import { superAdminEmail } from "../config/vars.js";

export const seedSuperAdmin = async () => {
  const existing = await User.findOne({ where: { is_super_admin: true } });
  if (existing) return;

  const password_hash = await bcrypt.hash("admin", 10);

  await User.create({
    email: superAdminEmail.email,
    name: superAdminEmail.name || "Super Admin",
    password_hash,
    is_super_admin: true,
    status: "active",
  });

  console.info(`super admin user created: ${superAdminEmail.email}`);
};
