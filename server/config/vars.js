export const port = process.env.PORT;

export const db = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  name: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: "mysql",
};

export const redis = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
};

export const superAdminEmail = {
    email : process.env.SUPER_ADMIN_EMAIL,
    name :  process.env.SUPER_ADMIN_NAME,
};
