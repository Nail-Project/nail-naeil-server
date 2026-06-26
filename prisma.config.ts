import dotenv = require("dotenv");
import prismaConfig = require("prisma/config");

dotenv.config();

const { defineConfig } = prismaConfig;
const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

export = defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
