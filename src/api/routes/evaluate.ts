import { Router } from 'express';
import type { Request, Response } from 'express';
import { validate } from '../middleware/validate.js';
import { evaluateBodySchema } from '../schemas/preferences.js';
import * as defaultPrefsRepo from '../../infrastructure/repositories/defaultPreferences.js';
import * as userPrefsRepo from '../../infrastructure/repositories/userPreferences.js';
import * as quietHoursRepo from '../../infrastructure/repositories/quietHours.js';
import * as globalPoliciesRepo from '../../infrastructure/repositories/globalPolicies.js';
import { evaluate } from '../../domain/evaluate.js';
import { logger } from '../../infrastructure/logger.js';

export const evaluateRouter = Router();

evaluateRouter.post(
  '/evaluate',
  validate(evaluateBodySchema),
  async (req: Request, res: Response) => {
    const params = req.body;

    logger.info(
      {
        userId: params.userId,
        type: params.notificationType,
        channel: params.channel,
      },
      'Evaluating notification',
    );

    const [userPreferences, defaultPreferences, globalPolicies, quietHours] =
      await Promise.all([
        userPrefsRepo.getUserPreferences(params.userId),
        defaultPrefsRepo.getAllDefaultPreferences(),
        globalPoliciesRepo.getAllGlobalPolicies(),
        quietHoursRepo.getQuietHours(params.userId),
      ]);

    const decision = evaluate(
      params,
      userPreferences,
      defaultPreferences,
      globalPolicies,
      quietHours,
    );

    logger.info({ decision }, 'Evaluation result');

    res.json(decision);
  },
);
