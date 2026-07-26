import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

let prisma: PrismaClient | undefined;

export const getPrisma = (): PrismaClient => {
  if (prisma) {
    return prisma;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL이 설정되지 않았습니다.');
  }

  const adapter = new PrismaMariaDb(databaseUrl);

  prisma = new PrismaClient({
    adapter,
    log: ['query', 'info', 'error', 'warn'],
  });

  return prisma;
};
