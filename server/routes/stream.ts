import { Router, Request, Response } from 'express';
import { streamText } from '../lib/bedrockClient';

const router = Router();

/**
 * GET /api/stream?prompt=...&temperature=...&topP=...&maxTokens=...
 * Server-Sent Events (SSE) — streams tokens to the browser in real time.
 * This powers the "token-by-token" visualisation in Module 1.
 */
router.get('/', async (req: Request, res: Response) => {
  const {
    prompt,
    systemPrompt,
    temperature,
    topP,
    maxTokens,
    stopSequences,
    modelId,
  } = req.query as Record<string, string>;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (type: string, data: unknown) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let tokenCount = 0;
    let fullText = '';
    let stopReason = 'end_turn';
    const start = Date.now();

    const gen = streamText(
      {
        prompt,
        systemPrompt,
        temperature: temperature ? parseFloat(temperature) : 0.7,
        topP: topP ? parseFloat(topP) : 0.9,
        maxTokens: maxTokens ? parseInt(maxTokens, 10) : 512,
        stopSequences: stopSequences ? JSON.parse(stopSequences) : [],
        modelId,
      },
      (meta) => { stopReason = meta.stopReason; },
    );

    for await (const chunk of gen) {
      fullText += chunk;
      tokenCount++;
      sendEvent('token', { chunk, tokenCount, elapsed: Date.now() - start });
    }

    sendEvent('done', {
      fullText,
      totalTokens: tokenCount,
      totalMs: Date.now() - start,
      stopReason,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    sendEvent('error', { message });
  }

  return res.end();
});

export default router;
