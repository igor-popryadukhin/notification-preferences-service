import { Router } from 'express';
import type { Request, Response } from 'express';
import { validate } from '../middleware/validate.js';
import { upsertPreferencesBodySchema } from '../schemas/preferences.js';
import * as defaultPrefsRepo from '../../infrastructure/repositories/defaultPreferences.js';
import * as userPrefsRepo from '../../infrastructure/repositories/userPreferences.js';
import * as quietHoursRepo from '../../infrastructure/repositories/quietHours.js';
import { mergePreferences } from '../../domain/merge.js';
import { logger } from '../../infrastructure/logger.js';

export const preferencesRouter = Router();

preferencesRouter.get(
  '/users/:userId/preferences',
  async (req: Request, res: Response) => {
    const userId = req.params.userId as string;

    logger.info({ userId }, 'Fetching user preferences');

    const [defaults, userPrefs, quietHours] = await Promise.all([
      defaultPrefsRepo.getAllDefaultPreferences(),
      userPrefsRepo.getUserPreferences(userId),
      quietHoursRepo.getQuietHours(userId),
    ]);

    const effectivePreferences = mergePreferences(userPrefs, defaults);

    res.json({
      userId,
      preferences: effectivePreferences,
      quietHours,
    });
  },
);

preferencesRouter.post(
  '/users/:userId/preferences',
  validate(upsertPreferencesBodySchema),
  async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const { preferences, quietHours } = req.body;

    logger.info({ userId }, 'Upserting user preferences');

    if (preferences && preferences.length > 0) {
      await userPrefsRepo.upsertUserPreferences(userId, preferences);
    }

    if (quietHours) {
      await quietHoursRepo.upsertQuietHours(userId, quietHours);
    }

    const [defaults, userPrefs, qh] = await Promise.all([
      defaultPrefsRepo.getAllDefaultPreferences(),
      userPrefsRepo.getUserPreferences(userId),
      quietHoursRepo.getQuietHours(userId),
    ]);

    const effectivePreferences = mergePreferences(userPrefs, defaults);

    res.status(200).json({
      userId,
      preferences: effectivePreferences,
      quietHours: qh,
    });
  },
);
