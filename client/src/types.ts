// ─── Shared types used across the entire client ───────────────────────────────

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string;
  latencyMs: number;
}

export interface CompareResult {
  mode: 'compare';
  left: GenerateResult;
  right: GenerateResult;
}

export interface SingleResult {
  mode: 'single';
  result: GenerateResult;
}

export type ApiResult = CompareResult | SingleResult;

export interface LlmSettings {
  temperature: number;
  topP: number;
  maxTokens: number;
  stopSequences: string[];
  frequencyPenalty: number;
  presencePenalty: number;
}

export interface ModelCard {
  id: string;
  name: string;
  provider: string;
  tier: 'fast' | 'balanced' | 'powerful';
  costPer1kInput: number;
  costPer1kOutput: number;
  contextWindow: number;
  strengths: string[];
  bestFor: string[];
  bedrockModelId: string;
  approved: boolean;
  badge?: string;
}

export type FailureType = 'hallucination' | 'cost_spike' | 'unsafe_output';

export interface FailureCase {
  id: string;
  title: string;
  prompt: string;
  output: string;
  correctType: FailureType;
  severity: 'sev1' | 'sev2' | 'sev3';
  correctFix: string;
  explanation: string;
}
