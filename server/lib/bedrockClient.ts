import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import dotenv from 'dotenv';

dotenv.config();

const region  = process.env.AWS_REGION  || 'us-east-1';
const profile = process.env.AWS_PROFILE || 'default';

const credentials = process.env.AWS_ACCESS_KEY_ID
  ? undefined                // SDK picks up env vars automatically
  : fromIni({ profile });

export const bedrockClient = new BedrockRuntimeClient({
  region,
  ...(credentials && { credentials }),
});

export const DEFAULT_MODEL = process.env.BEDROCK_MODEL_ID      || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';
export const FAST_MODEL    = process.env.BEDROCK_MODEL_ID_FAST || 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface GenerateParams {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  topK?: number;        // hard count cutoff — 0 means disabled
  maxTokens?: number;
  stopSequences?: string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
  modelId?: string;
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string;
  latencyMs: number;
}

/**
 * Build the Anthropic request body.
 *
 * Sampling rules (from AWS Bedrock + Anthropic docs):
 *  - Never send both temperature AND top_p at the same time — Claude 4+ rejects it.
 *  - top_k is always safe to include alongside either temperature or top_p.
 *  - Strategy: send temperature by default; only switch to top_p when the caller
 *    explicitly sets topP away from its default AND leaves temperature at default.
 */
function buildBody(params: {
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  stopSequences: string[];
}) {
  const { prompt, systemPrompt, temperature, topP, topK, maxTokens, stopSequences } = params;

  const defaultTemp = 0.7;
  const defaultTopP = 0.9;

  // Decide: temperature XOR top_p — never both
  const samplingParam =
    topP !== defaultTopP && temperature === defaultTemp
      ? { top_p: Math.max(0, Math.min(1, topP)) }
      : { temperature: Math.max(0, Math.min(1, temperature)) };

  // top_k is safe to add independently (Bedrock supports it alongside either)
  const topKParam = topK > 0 ? { top_k: topK } : {};

  return {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    ...samplingParam,
    ...topKParam,
    ...(stopSequences.length > 0 && { stop_sequences: stopSequences }),
    ...(systemPrompt && { system: systemPrompt }),
    messages: [{ role: 'user', content: prompt }],
  };
}

// ─── Non-streaming invoke ───────────────────────────────────────────────────

export async function generateText(params: GenerateParams): Promise<GenerateResult> {
  const {
    prompt,
    systemPrompt,
    temperature = 0.7,
    topP        = 0.9,
    topK        = 0,
    maxTokens   = 512,
    stopSequences = [],
    modelId = DEFAULT_MODEL,
  } = params;

  const body = buildBody({ prompt, systemPrompt, temperature, topP, topK, maxTokens, stopSequences });

  const start   = Date.now();
  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept:      'application/json',
    body: JSON.stringify(body),
  });

  const response  = await bedrockClient.send(command);
  const latencyMs = Date.now() - start;
  const decoded   = JSON.parse(new TextDecoder().decode(response.body));

  return {
    text:         decoded.content?.[0]?.text ?? '',
    inputTokens:  decoded.usage?.input_tokens  ?? 0,
    outputTokens: decoded.usage?.output_tokens ?? 0,
    stopReason:   decoded.stop_reason ?? 'end_turn',
    latencyMs,
  };
}

// ─── Streaming invoke ───────────────────────────────────────────────────────

export async function* streamText(
  params: GenerateParams,
  onMeta?: (meta: { stopReason: string; outputTokens: number }) => void,
): AsyncGenerator<string> {
  const {
    prompt,
    systemPrompt,
    temperature = 0.7,
    topP        = 0.9,
    topK        = 0,
    maxTokens   = 512,
    stopSequences = [],
    modelId = DEFAULT_MODEL,
  } = params;

  const body    = buildBody({ prompt, systemPrompt, temperature, topP, topK, maxTokens, stopSequences });
  const command = new InvokeModelWithResponseStreamCommand({
    modelId,
    contentType: 'application/json',
    accept:      'application/json',
    body: JSON.stringify(body),
  });

  const response = await bedrockClient.send(command);
  const stream   = response.body;
  if (!stream) return;

  for await (const event of stream) {
    if (event.chunk?.bytes) {
      const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        yield chunk.delta.text as string;
      }
      // Capture stop_reason + output token count from the message_delta event
      if (chunk.type === 'message_delta' && onMeta) {
        onMeta({
          stopReason:   chunk.delta?.stop_reason  ?? 'end_turn',
          outputTokens: chunk.usage?.output_tokens ?? 0,
        });
      }
    }
  }
}
