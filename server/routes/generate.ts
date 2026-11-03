import { Router, Request, Response } from 'express';
import { generateText, GenerateParams } from '../lib/bedrockClient';

const router = Router();

/**
 * POST /api/generate
 * Runs two calls in parallel when mode=compare (for Module 2 side-by-side),
 * or a single call otherwise.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      systemPrompt,
      temperature,
      topP,
      topK,
      maxTokens,
      stopSequences,
      modelId,
      mode,
      compareWith,
    } = req.body as {
      prompt: string;
      systemPrompt?: string;
      temperature?: number;
      topP?: number;
      topK?: number;
      maxTokens?: number;
      stopSequences?: string[];
      modelId?: string;
      mode?: string;
      compareWith?: Partial<GenerateParams>;
    };

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const baseParams: GenerateParams = {
      prompt,
      systemPrompt,
      temperature,
      topP,
      topK,
      maxTokens,
      stopSequences,
      modelId,
    };

    if (mode === 'compare' && compareWith) {
      // Side-by-side: run both calls in parallel
      const [left, right] = await Promise.all([
        generateText(baseParams),
        generateText({ ...baseParams, ...compareWith }),
      ]);
      return res.json({ mode: 'compare', left, right });
    }

    const result = await generateText(baseParams);
    return res.json({ mode: 'single', result });
  } catch (err: unknown) {
    console.error('[generate]', err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
});

export default router;
