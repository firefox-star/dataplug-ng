import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbInitStarted: boolean | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

if (!globalForPrisma.dbInitStarted) {
  globalForPrisma.dbInitStarted = true;
  import('./db-init')
    .then(({ initDatabase }) => initDatabase(db))
    .then(() => console.log('[db] Database initialized'))
    .catch((err) => {
      console.error('[db] Init error:', err);
      globalForPrisma.dbInitStarted = false;
    });
}
