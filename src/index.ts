import { createApp } from './api/app.js';
import { config } from './config.js';
import { testConnection } from './infrastructure/database/pool.js';
import { logger } from './infrastructure/logger.js';

async function main(): Promise<void> {
  const connected = await testConnection();
  if (!connected) {
    logger.error('Database connection failed');
    process.exit(1);
  }
  logger.info('Database connected');

  const app = createApp();

  app.listen(config.server.port, () => {
    logger.info({ port: config.server.port }, 'Server started');
  });
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
