import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const dbUrl = new URL(process.env.DATABASE_URL!);

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  port: parseInt(dbUrl.port) || 3306,
  connectionLimit: 10,
});

export const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'error', 'warn'],
});
