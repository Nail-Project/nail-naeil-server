import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'mysql://prisma:prisma@localhost:3306/prisma';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
