import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';

config({ path: path.join(__dirname, 'app/.env') });

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'app/prisma/schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrate: {
    adapter: async () => {
      const { PrismaPostgres } = await import('@prisma/adapter-postgres');
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      return new PrismaPostgres(pool);
    },
  },
});

