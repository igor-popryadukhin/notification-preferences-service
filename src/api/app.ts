import express from 'express';
import { preferencesRouter } from './routes/preferences.js';
import { evaluateRouter } from './routes/evaluate.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): express.Application {
  const app = express();

  app.use(express.json());

  app.use(preferencesRouter);
  app.use(evaluateRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(errorHandler);

  return app;
}
