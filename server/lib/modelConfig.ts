// Approved model catalogue shown in Module 5 — Model Selection

export interface ModelCard {
  id: string;
  name: string;
  provider: string;
  tier: 'fast' | 'balanced' | 'powerful';
  costPer1kInput: number;  // USD
  costPer1kOutput: number; // USD
  contextWindow: number;
  strengths: string[];
  bestFor: string[];
  bedrockModelId: string;
  approved: boolean;
  badge?: string;
}

export const MODEL_CATALOGUE: ModelCard[] = [
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic (via Bedrock)',
    tier: 'fast',
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.00125,
    contextWindow: 200000,
    strengths: ['Ultra-low latency', 'Cost-efficient', 'Good instruction following'],
    bestFor: ['High-volume classification', 'Quick Q&A', 'Real-time assistants'],
    bedrockModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    approved: true,
    badge: '⚡ Fast',
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic (via Bedrock)',
    tier: 'balanced',
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    contextWindow: 200000,
    strengths: ['Best intelligence/cost ratio', 'Strong reasoning', 'Code generation'],
    bestFor: ['Complex reasoning', 'Code review', 'Long-form content', 'RAG pipelines'],
    bedrockModelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    approved: true,
    badge: '⭐ Recommended',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic (via Bedrock)',
    tier: 'powerful',
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    contextWindow: 200000,
    strengths: ['Top-tier reasoning', 'Complex multi-step tasks', 'Research-grade output'],
    bestFor: ['High-stakes decisions', 'Complex analysis', 'Scientific reasoning'],
    bedrockModelId: 'anthropic.claude-3-opus-20240229-v1:0',
    approved: true,
    badge: '🧠 Powerful',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI / Azure OpenAI',
    tier: 'powerful',
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    contextWindow: 128000,
    strengths: ['Multimodal (vision)', 'Strong function calling', 'Large ecosystem'],
    bestFor: ['Vision tasks', 'Function calling', 'Azure-integrated workflows'],
    bedrockModelId: '',
    approved: true,
    badge: '👁️ Multimodal',
  },
  {
    id: 'llama3',
    name: 'Meta Llama 3 (70B)',
    provider: 'Open Source (via Bedrock)',
    tier: 'balanced',
    costPer1kInput: 0.00099,
    costPer1kOutput: 0.00099,
    contextWindow: 8192,
    strengths: ['Open weights', 'Self-hostable', 'Cost-efficient at scale'],
    bestFor: ['On-prem requirements', 'Data privacy', 'Fine-tuning use cases'],
    bedrockModelId: 'meta.llama3-70b-instruct-v1:0',
    approved: true,
    badge: '🔓 Open Source',
  },
  {
    id: 'gpt-3-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI (unapproved)',
    tier: 'fast',
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0015,
    contextWindow: 16385,
    strengths: ['Cheap', 'Fast'],
    bestFor: [],
    bedrockModelId: '',
    approved: false,
    badge: '❌ Not Approved',
  },
];
