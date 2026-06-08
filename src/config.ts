export const config = {
  database: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/notification_prefs',
  },
  server: {
    port: parseInt(process.env.PORT ?? '3000', 10),
  },
  log: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
};
