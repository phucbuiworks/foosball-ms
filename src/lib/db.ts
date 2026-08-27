import postgres from 'postgres';

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

export const sql =
  globalForDb.conn ??
  postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
    // Disable idle timeout in development to keep the connection open,
    // but in serverless it will close eventually.
    max: 10,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.conn = sql;
}
