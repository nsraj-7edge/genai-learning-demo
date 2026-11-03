import { Router, Request, Response } from 'express';
import { MODEL_CATALOGUE } from '../lib/modelConfig';

const router = Router();

/**
 * GET /api/models
 * Returns the approved model catalogue for Module 5.
 */
router.get('/', (_req: Request, res: Response) => {
  res.json(MODEL_CATALOGUE);
});

export default router;
