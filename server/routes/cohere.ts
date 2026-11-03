/**
 * POST /api/cohere
 * Calls Cohere command-text-v14 via Bedrock's native InvokeModel API.
 * This model DOES support frequency_penalty and presence_penalty natively.
 *
 * Request body: { prompt, maxTokens, temperature, frequencyPenalty, presencePenalty }
 * Response:     { text, finishReason, latencyMs }
 */
import { Router, Request, Response } from 'express';
import { bedrockClient } from '../lib/bedrockClient';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const router = Router();

const COHERE_MODEL = 'cohere.command-text-v14';

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      maxTokens        = 300,
      temperature      = 0.7,
      frequencyPenalty = 0,
      presencePenalty  = 0,
    } = req.body as {
      prompt: string;
      maxTokens?: number;
      temperature?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    };

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const body = JSON.stringify({
      prompt,
      max_tokens:        maxTokens,
      temperature:       Math.max(0, Math.min(5, temperature)),
      frequency_penalty: Math.max(0, Math.min(1, frequencyPenalty)),
      presence_penalty:  Math.max(0, Math.min(1, presencePenalty)),
      p: 0.75,
      k: 0,
    });

    const start = Date.now();

    const command = new InvokeModelCommand({
      modelId:     COHERE_MODEL,
      contentType: 'application/json',
      accept:      'application/json',
      body,
    });

    const response  = await bedrockClient.send(command);
    const latencyMs = Date.now() - start;
    const decoded   = JSON.parse(new TextDecoder().decode(response.body));

    // Cohere command-text-v14 response: { generations: [{ text, finish_reason }] }
    const generation = decoded.generations?.[0] ?? {};

    return res.json({
      text:        generation.text ?? '',
      finishReason: generation.finish_reason ?? 'COMPLETE',
      latencyMs,
    });
  } catch (err: unknown) {
    console.error('[cohere]', err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
});

export default router;
