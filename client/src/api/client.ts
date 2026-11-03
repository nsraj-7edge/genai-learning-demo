import type { ApiResult, ModelCard } from '../types';

// Proxy for standard REST calls — goes through Vite's /api proxy
const BASE = '/api';
// Direct backend for SSE — Vite's proxy buffers chunks, breaking streaming
const STREAM_BASE = 'http://localhost:3001/api';

// ─── Generate (non-streaming) ─────────────────────────────────────────────────

export interface GenerateRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  stopSequences?: string[];
  modelId?: string;
  mode?: 'single' | 'compare';
  compareWith?: Partial<GenerateRequest>;
}

export async function generate(params: GenerateRequest): Promise<ApiResult> {
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API error');
  }
  return res.json();
}

// ─── Streaming (SSE) — calls backend directly to bypass Vite proxy buffering

export interface StreamCallbacks {
  onToken: (chunk: string, count: number, elapsedMs: number) => void;
  onDone: (fullText: string, totalTokens: number, totalMs: number, stopReason: string) => void;
  onError: (message: string) => void;
}

export function streamGenerate(
  params: Omit<GenerateRequest, 'mode' | 'compareWith'>,
  callbacks: StreamCallbacks
): () => void {
  const qs = new URLSearchParams({
    prompt: params.prompt,
    ...(params.systemPrompt && { systemPrompt: params.systemPrompt }),
    ...(params.temperature !== undefined && { temperature: String(params.temperature) }),
    ...(params.topP !== undefined && { topP: String(params.topP) }),
    ...(params.maxTokens !== undefined && { maxTokens: String(params.maxTokens) }),
    ...(params.stopSequences?.length && { stopSequences: JSON.stringify(params.stopSequences) }),
    ...(params.modelId && { modelId: params.modelId }),
  });

  // Direct URL — bypasses Vite proxy so SSE events flush immediately
  const es = new EventSource(`${STREAM_BASE}/stream?${qs}`);

  es.addEventListener('token', (e: MessageEvent) => {
    const d = JSON.parse(e.data);
    callbacks.onToken(d.chunk, d.tokenCount, d.elapsed);
  });
  es.addEventListener('done', (e: MessageEvent) => {
    const d = JSON.parse(e.data);
    callbacks.onDone(d.fullText, d.totalTokens, d.totalMs, d.stopReason ?? 'end_turn');
    es.close();
  });
  es.addEventListener('error', (e: MessageEvent) => {
    const d = JSON.parse((e as MessageEvent).data ?? '{}');
    callbacks.onError(d.message || 'Stream error');
    es.close();
  });
  es.onerror = () => {
    callbacks.onError('Connection to stream failed — is the server running?');
    es.close();
  };

  return () => es.close();
}

// ─── Cohere (frequency_penalty / presence_penalty demo) ──────────────────────

export interface CohereRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface CohereResult {
  text: string;
  finishReason: string;
  latencyMs: number;
}

export async function callCohere(params: CohereRequest): Promise<CohereResult> {
  const res = await fetch(`${BASE}/cohere`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Cohere API error');
  }
  return res.json();
}

// ─── Models catalogue ─────────────────────────────────────────────────────────

export async function fetchModels(): Promise<ModelCard[]> {
  const res = await fetch(`${BASE}/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function fetchHealth(): Promise<{
  status: string; region: string; profile: string; model: string;
}> {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}
