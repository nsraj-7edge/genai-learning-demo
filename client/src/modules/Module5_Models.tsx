/**
 * Module 5 — Model Selection & LLM Architecture
 *
 * Sections:
 *  1. What is a foundation model — the complete picture
 *  2. Every major model family on Bedrock (full card catalogue)
 *  3. How to choose — decision framework
 *  4. Architecture patterns — Direct / RAG / Agent (interactive decision tree)
 *  5. Full request lifecycle visualisation
 */
import { useState, useEffect } from 'react';
import {
  Server, Zap, Brain, Database, CheckCircle, XCircle,
  ChevronRight, Layers, GitMerge, Search, MessageSquare,
  MemoryStick, ArrowRight, Info, Cpu,
  BookOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import { fetchModels } from '../api/client';
import type { ModelCard } from '../types';
import TheoryCard from '../components/TheoryCard';
import Callout from '../components/Callout';

const GLOSSARY_M5 = [
  {
    term: 'Foundation Model',
    color: 'var(--blue)',
    simple: 'A large neural network pre-trained on massive data that can do many tasks without retraining — just a system prompt.',
    technical: 'Large-scale transformer pre-trained on web-scale corpora via next-token prediction. Fine-tuned with RLHF for instruction following. Used as a general-purpose base for downstream tasks via prompting.',
  },
  {
    term: 'Pre-training',
    color: 'var(--blue)',
    simple: 'Phase 1 of building a model — it reads trillions of tokens from the internet, books, and code, learning patterns and facts.',
    technical: 'Self-supervised learning on massive token sequences using next-token prediction objective. Produces base model weights encoding broad world knowledge and language structure.',
  },
  {
    term: 'RLHF',
    color: 'var(--purple)',
    simple: 'Phase 2 — trained further using human feedback to be helpful, honest, and safe. This is what makes the model follow instructions.',
    technical: 'Reinforcement Learning from Human Feedback. Human raters score model outputs → reward model trained → base model fine-tuned via PPO to maximise reward. Aligns behaviour post-pretraining.',
  },
  {
    term: 'Model Tier',
    color: 'var(--teal)',
    simple: 'Fast (cheap, quick, simple tasks), Balanced (best cost/quality ratio), Powerful (most capable, most expensive).',
    technical: 'Classification by capability/cost tradeoff. Fast: Haiku, Nova Lite. Balanced: Sonnet, Nova Pro, Llama 70B. Powerful: Opus. Tier selection is the first decision in model choice.',
  },
  {
    term: 'Cross-region Inference',
    color: 'var(--teal)',
    simple: 'Model IDs starting with "us." route your request across multiple AWS regions automatically for higher throughput.',
    technical: 'AWS Bedrock inference profiles. The "us." prefix (e.g. us.anthropic.claude-...) enables cross-region routing across us-east-1, us-west-2, etc. Higher token-per-minute limits than single-region.',
  },
  {
    term: 'Direct LLM Call',
    color: 'var(--teal)',
    simple: 'Simplest pattern — send system prompt + user message, get response. No retrieval, no tools, no memory.',
    technical: 'Single InvokeModel or InvokeModelWithResponseStream call. Input: system + messages array. Output: completion. Stateless — no memory between calls without explicit history injection.',
  },
  {
    term: 'RAG',
    color: 'var(--blue)',
    simple: 'Retrieval-Augmented Generation. Before answering, the model first searches a document store and injects relevant chunks into the prompt.',
    technical: 'Query embedded → similarity search in vector DB → top-K chunks retrieved → injected into context window → model generates grounded response. Reduces hallucination on domain-specific knowledge.',
  },
  {
    term: 'Agentic Pattern',
    color: 'var(--purple)',
    simple: 'The LLM plans, calls tools (APIs, search, code), observes results, and loops until the goal is done. Multi-step, autonomous.',
    technical: 'ReAct loop: Reason → Act (tool call) → Observe (result) → Reason again. Terminates when goal achieved or max steps reached. AWS Bedrock Agents manages orchestration, memory, and tool routing.',
  },
  {
    term: 'Vector Search',
    color: 'var(--amber)',
    simple: 'Finding the most relevant documents by converting text to numbers (vectors) and measuring similarity between them.',
    technical: 'Embeds query and corpus as high-dimensional vectors. Retrieves top-K by cosine similarity or dot product. AWS Bedrock Knowledge Bases uses OpenSearch Serverless as the vector store.',
  },
  {
    term: 'Context Window (cost)',
    color: 'var(--rose)',
    simple: 'Long system prompts, conversation history, and retrieved documents all count as input tokens — billed on every single call.',
    technical: 'Input token count = system_prompt + all message history + retrieved chunks + current message. Cost = sum × input_rate. Long conversations compound cost linearly with turns.',
  },
  {
    term: 'Open Weights',
    color: 'var(--amber)',
    simple: 'Models like Llama where you can download the actual model weights and run or fine-tune them yourself.',
    technical: 'Model weights released publicly under open license (e.g. Meta Llama under Llama Community License). Enables local deployment, fine-tuning, and model modification. Contrast with closed APIs (Claude, GPT-4).',
  },
];

function GlossaryPanelM5() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div style={{ width: 260, flexShrink: 0, position: 'sticky', top: 104, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 10 }}>
        <BookOpen size={14} color="var(--pink)" />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--pink)' }}>Key Terms</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{GLOSSARY_M5.length} terms</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {GLOSSARY_M5.map(g => {
          const isOpen = expanded === g.term;
          return (
            <div key={g.term} style={{ background: isOpen ? `color-mix(in srgb, ${g.color} 8%, rgba(255,255,255,0.03))` : 'rgba(255,255,255,0.025)', border: `1px solid ${isOpen ? `color-mix(in srgb, ${g.color} 30%, transparent)` : 'rgba(255,255,255,0.07)'}`, borderRadius: 9, overflow: 'hidden', transition: 'all 0.2s ease' }}>
              <button onClick={() => setExpanded(isOpen ? null : g.term)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: g.color, boxShadow: isOpen ? `0 0 8px ${g.color}` : 'none', transition: 'box-shadow 0.2s' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: isOpen ? g.color : 'var(--text-primary)', flex: 1, lineHeight: 1.3 }}>{g.term}</span>
                {isOpen ? <ChevronUp size={11} color="var(--text-muted)" /> : <ChevronDown size={11} color="var(--text-muted)" />}
              </button>
              {isOpen && (
                <div style={{ padding: '0 12px 12px', animation: 'fadeUp 0.18s ease' }}>
                  <div style={{ padding: '8px 10px', marginBottom: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 7 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Plain English</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{g.simple}</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: `color-mix(in srgb, ${g.color} 6%, transparent)`, border: `1px solid color-mix(in srgb, ${g.color} 18%, transparent)`, borderRadius: 7 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: g.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Technical</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{g.technical}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, padding: '8px 10px', fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6, textAlign: 'center' }}>Click any term to expand</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Model catalogue data — sourced from AWS Bedrock docs + Anthropic model overview
// platform.claude.com/docs/en/docs/about-claude/models/overview
// docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html
// ─────────────────────────────────────────────────────────────────────────────

interface ModelInfo {
  provider: string;
  family: string;
  name: string;
  tier: 'fast' | 'balanced' | 'powerful';
  color: string;
  contextK: number;           // context window in K tokens
  inputPer1M: number;         // $ per 1M input tokens
  outputPer1M: number;        // $ per 1M output tokens
  bedrockId: string;
  strengths: string[];
  bestFor: string[];
  notFor: string[];
  onBedrock: boolean;
}

const MODELS: ModelInfo[] = [
  // ── Anthropic Claude ──────────────────────────────────────────────────────
  {
    provider: 'Anthropic', family: 'Claude', name: 'Claude Haiku 4.5',
    tier: 'fast', color: 'var(--teal)',
    contextK: 200, inputPer1M: 0.80, outputPer1M: 4.00,
    bedrockId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
    strengths: ['Sub-second latency', 'Very low cost', 'High throughput'],
    bestFor: ['Classification', 'Extraction', 'Simple Q&A', 'Moderation', 'Routing'],
    notFor: ['Complex multi-step reasoning', 'Long creative writing'],
    onBedrock: true,
  },
  {
    provider: 'Anthropic', family: 'Claude', name: 'Claude Sonnet 4.5',
    tier: 'balanced', color: 'var(--blue)',
    contextK: 200, inputPer1M: 3.00, outputPer1M: 15.00,
    bedrockId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    strengths: ['Best capability/cost ratio', 'Coding', 'Agents', '200K context'],
    bestFor: ['Production agents', 'Code generation', 'Summarisation', 'Analysis'],
    notFor: ['Extreme latency requirements (use Haiku)', 'Ultra-complex reasoning (use Opus)'],
    onBedrock: true,
  },
  {
    provider: 'Anthropic', family: 'Claude', name: 'Claude Opus 4.6',
    tier: 'powerful', color: 'var(--purple)',
    contextK: 200, inputPer1M: 15.00, outputPer1M: 75.00,
    bedrockId: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
    strengths: ['Highest intelligence', 'Complex reasoning', 'Research tasks'],
    bestFor: ['Complex multi-step reasoning', 'Research', 'Hard coding problems'],
    notFor: ['High-volume production (too expensive)', 'Real-time applications'],
    onBedrock: true,
  },
  // ── Meta Llama ────────────────────────────────────────────────────────────
  {
    provider: 'Meta', family: 'Llama', name: 'Llama 3.3 70B',
    tier: 'balanced', color: 'var(--amber)',
    contextK: 128, inputPer1M: 0.72, outputPer1M: 0.72,
    bedrockId: 'us.meta.llama3-3-70b-instruct-v1:0',
    strengths: ['Open weights', 'Low cost', 'Multilingual', 'Fine-tunable'],
    bestFor: ['Cost-sensitive production', 'Fine-tuning', 'On-premise deployments'],
    notFor: ['Tasks needing > 128K context', 'Complex tool use'],
    onBedrock: true,
  },
  {
    provider: 'Meta', family: 'Llama', name: 'Llama 3.2 11B Vision',
    tier: 'fast', color: 'var(--amber)',
    contextK: 128, inputPer1M: 0.16, outputPer1M: 0.16,
    bedrockId: 'us.meta.llama3-2-11b-instruct-v1:0',
    strengths: ['Multimodal (text + image)', 'Very cheap', 'Fast'],
    bestFor: ['Image understanding', 'Document OCR', 'Visual Q&A'],
    notFor: ['Long document processing', 'Complex reasoning'],
    onBedrock: true,
  },
  // ── Mistral ───────────────────────────────────────────────────────────────
  {
    provider: 'Mistral AI', family: 'Mistral', name: 'Mistral Large 2407',
    tier: 'balanced', color: 'var(--rose)',
    contextK: 128, inputPer1M: 2.00, outputPer1M: 6.00,
    bedrockId: 'mistral.mistral-large-2407-v1:0',
    strengths: ['Strong reasoning', 'European compliance', 'Multilingual'],
    bestFor: ['European data residency', 'Legal/financial analysis', 'Multilingual apps'],
    notFor: ['> 128K context tasks'],
    onBedrock: true,
  },
  // ── Amazon Nova ───────────────────────────────────────────────────────────
  {
    provider: 'Amazon', family: 'Nova', name: 'Amazon Nova Pro',
    tier: 'balanced', color: 'var(--green)',
    contextK: 300, inputPer1M: 0.80, outputPer1M: 3.20,
    bedrockId: 'us.amazon.nova-pro-v1:0',
    strengths: ['Largest context on Bedrock', 'AWS-native integration', 'Agentic tasks'],
    bestFor: ['Very long documents', 'AWS workloads', 'RAG over large corpora'],
    notFor: ['Tasks needing Anthropic-specific safety tuning'],
    onBedrock: true,
  },
  {
    provider: 'Amazon', family: 'Nova', name: 'Amazon Nova Lite',
    tier: 'fast', color: 'var(--green)',
    contextK: 300, inputPer1M: 0.06, outputPer1M: 0.24,
    bedrockId: 'us.amazon.nova-lite-v1:0',
    strengths: ['Cheapest on Bedrock', 'Multimodal', 'Very fast'],
    bestFor: ['Bulk processing', 'Cheap classification at scale', 'Prototype'],
    notFor: ['Complex reasoning', 'High-quality generation'],
    onBedrock: true,
  },
  // ── Cohere ────────────────────────────────────────────────────────────────
  {
    provider: 'Cohere', family: 'Command', name: 'Command R+',
    tier: 'balanced', color: 'var(--pink)',
    contextK: 128, inputPer1M: 2.50, outputPer1M: 10.00,
    bedrockId: 'cohere.command-r-plus-v1:0',
    strengths: ['RAG-optimised', 'Tool use', 'Long context retrieval'],
    bestFor: ['Enterprise RAG', 'Citation generation', 'Document Q&A'],
    notFor: ['General chat (Claude is better)'],
    onBedrock: true,
  },
];

const TIER_COLOR: Record<string, string> = {
  fast: 'var(--teal)', balanced: 'var(--blue)', powerful: 'var(--purple)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Visuals
// ─────────────────────────────────────────────────────────────────────────────

function FoundationModelDiagram() {
  const layers = [
    { label: 'Pre-training data', sub: 'Trillions of tokens from the internet, books, code', color: 'rgba(59,130,246,0.18)', icon: '📚' },
    { label: 'Neural network weights', sub: 'Billions of parameters learned during training', color: 'rgba(139,92,246,0.18)', icon: '🧠' },
    { label: 'Foundation model (frozen)', sub: 'General-purpose language understanding', color: 'rgba(20,184,166,0.25)', icon: '⚙️' },
    { label: 'Fine-tuning / RLHF', sub: 'Instruction following, safety, helpfulness', color: 'rgba(245,158,11,0.18)', icon: '🎯' },
    { label: 'Your application', sub: 'System prompt + messages + API call', color: 'rgba(34,197,94,0.18)', icon: '🚀' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {layers.map((l, i) => (
        <div key={l.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', padding: '8px 12px', background: l.color, borderRadius: 7, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{l.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{l.label}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{l.sub}</div>
            </div>
          </div>
          {i < layers.length - 1 && <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0' }}>↓</div>}
        </div>
      ))}
    </div>
  );
}

function ScaleBars() {
  const props = [
    { label: 'Haiku 4.5',   cost: 5,  speed: 98, quality: 72, color: 'var(--teal)'   },
    { label: 'Sonnet 4.5',  cost: 22, speed: 78, quality: 91, color: 'var(--blue)'   },
    { label: 'Opus 4.6',    cost: 100, speed: 42, quality: 98, color: 'var(--purple)' },
    { label: 'Nova Lite',   cost: 1,  speed: 99, quality: 58, color: 'var(--green)'  },
    { label: 'Nova Pro',    cost: 12, speed: 80, quality: 84, color: 'var(--green)'  },
    { label: 'Llama 3.3',   cost: 5,  speed: 85, quality: 80, color: 'var(--amber)'  },
  ];
  return (
    <div>
      {(['Relative Cost', 'Speed', 'Quality / Capability'] as const).map(metric => {
        const key = metric === 'Relative Cost' ? 'cost' : metric === 'Speed' ? 'speed' : 'quality';
        const isRev = key === 'cost';
        return (
          <div key={metric} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 5 }}>
              {metric} {isRev ? '(↑ bad)' : '(↑ good)'}
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {props.map(p => {
                const val = p[key as keyof typeof p] as number;
                return (
                  <div key={p.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ width: '100%', height: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ width: '70%', height: `${val}%`, background: isRev && val > 50 ? 'var(--rose)' : p.color, borderRadius: '2px 2px 0 0', minHeight: 3, transition: 'height 0.4s ease' }} />
                    </div>
                    <div style={{ fontSize: 9, color: p.color, textAlign: 'center', fontWeight: 600, lineHeight: 1.2 }}>{p.label.split(' ')[0]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Architecture patterns
// ─────────────────────────────────────────────────────────────────────────────

function ArchitecturePipeline({ pattern }: { pattern: 'direct' | 'rag' | 'agent' }) {
  const steps = {
    direct: [
      { label: 'User message', color: 'rgba(255,255,255,0.1)', sub: 'Text input' },
      { label: 'System prompt', color: 'rgba(59,130,246,0.2)', sub: 'Instructions + context' },
      { label: 'LLM inference', color: 'rgba(20,184,166,0.25)', sub: 'Sonnet / Haiku / Opus' },
      { label: 'Response', color: 'rgba(34,197,94,0.2)', sub: 'Text output' },
    ],
    rag: [
      { label: 'User query', color: 'rgba(255,255,255,0.1)', sub: 'Natural language question' },
      { label: 'Embed query', color: 'rgba(59,130,246,0.2)', sub: 'Convert to vector' },
      { label: 'Vector search', color: 'rgba(139,92,246,0.2)', sub: 'Find relevant documents' },
      { label: 'Retrieved chunks', color: 'rgba(245,158,11,0.2)', sub: 'Top-K passages injected into context' },
      { label: 'LLM inference', color: 'rgba(20,184,166,0.25)', sub: 'Generates grounded answer' },
      { label: 'Response + citations', color: 'rgba(34,197,94,0.2)', sub: 'Answer with source references' },
    ],
    agent: [
      { label: 'User goal', color: 'rgba(255,255,255,0.1)', sub: 'High-level instruction' },
      { label: 'Plan', color: 'rgba(59,130,246,0.2)', sub: 'LLM breaks goal into steps' },
      { label: 'Tool call', color: 'rgba(139,92,246,0.2)', sub: 'Search / API / code execution' },
      { label: 'Observe result', color: 'rgba(245,158,11,0.2)', sub: 'Tool output fed back to LLM' },
      { label: 'Reason + decide', color: 'rgba(20,184,166,0.25)', sub: 'Continue or complete?' },
      { label: 'Final answer', color: 'rgba(34,197,94,0.2)', sub: 'Task accomplished' },
    ],
  };
  const list = steps[pattern];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 10 }}>
      {list.map((s, i) => (
        <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', padding: '7px 12px', background: s.color, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 12 }}>{s.label}</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{s.sub}</span>
          </div>
          {i < list.length - 1 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>↓</div>}
        </div>
      ))}
    </div>
  );
}

// Decision tree questions
const DT_QUESTIONS = [
  { q: 'Does the task need access to documents, databases, or real-time data the model was not trained on?', yes: 'rag', no: 1 },
  { q: 'Does it need to take actions, call external APIs, or complete multi-step goals autonomously?',        yes: 'agent', no: 2 },
  { q: 'Must it remember context across multiple separate sessions (different user logins)?',                 yes: 'agent', no: 'direct' },
];

type ArchResult = 'direct' | 'rag' | 'agent';

const ARCH_INFO: Record<ArchResult, { label: string; color: string; desc: string; when: string; bedrock: string }> = {
  direct: {
    label: 'Direct LLM Call',
    color: 'var(--teal)',
    desc: 'Send a system prompt + user message directly to the model. No retrieval, no tools, no memory layer. The simplest and cheapest pattern.',
    when: 'General Q&A, text generation, classification, extraction from provided text.',
    bedrock: 'Use InvokeModel or InvokeModelWithResponseStream API directly.',
  },
  rag: {
    label: 'Retrieval-Augmented Generation (RAG)',
    color: 'var(--blue)',
    desc: 'The model retrieves relevant documents from a knowledge base before generating its answer. Grounds the model in verified data, reduces hallucinations, keeps answers current without retraining.',
    when: 'Q&A over private documents, internal wikis, product manuals, anything that changes over time.',
    bedrock: 'AWS Bedrock Knowledge Bases — managed vector store + retrieval. S3 + OpenSearch Serverless backend.',
  },
  agent: {
    label: 'Agentic / Multi-step',
    color: 'var(--purple)',
    desc: 'The LLM plans, calls tools (APIs, search, code), observes results, and loops until the goal is achieved. Handles complex multi-step tasks that a single call cannot complete.',
    when: 'Workflow automation, booking systems, research agents, anything requiring tool use or cross-session memory.',
    bedrock: 'AWS Bedrock Agents — orchestration, memory, tool integration, guardrails all managed.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Model card component
// ─────────────────────────────────────────────────────────────────────────────

function ModelCardUI({ m, isSelected, onClick }: { m: ModelInfo; isSelected: boolean; onClick: () => void }) {
  const tc = TIER_COLOR[m.tier];
  return (
    <div onClick={onClick}
      style={{
        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
        background: isSelected ? `color-mix(in srgb, ${m.color} 8%, rgba(255,255,255,0.03))` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isSelected ? `color-mix(in srgb, ${m.color} 45%, transparent)` : 'rgba(255,255,255,0.08)'}`,
        boxShadow: isSelected ? `0 0 20px color-mix(in srgb, ${m.color} 18%, transparent)` : 'none',
        transition: 'all 0.2s ease',
        transform: isSelected ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{m.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{m.provider}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `color-mix(in srgb, ${tc} 14%, transparent)`, color: tc, border: `1px solid color-mix(in srgb, ${tc} 28%, transparent)`, textTransform: 'capitalize' }}>
          {m.tier}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 8 }}>
        {[
          { l: 'Input /1M',  v: `$${m.inputPer1M}`  },
          { l: 'Output /1M', v: `$${m.outputPer1M}` },
          { l: 'Context',    v: `${m.contextK}K`    },
        ].map(s => (
          <div key={s.l} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: m.color, fontFamily: 'var(--font-mono)' }}>{s.v}</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 1 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {m.strengths.slice(0, 3).map(s => (
          <span key={s} style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 99, background: `color-mix(in srgb, ${m.color} 10%, transparent)`, color: `color-mix(in srgb, ${m.color} 85%, white)`, border: `1px solid color-mix(in srgb, ${m.color} 22%, transparent)` }}>{s}</span>
        ))}
      </div>
      {isSelected && (
        <div style={{ marginTop: 8, fontSize: 11, color: m.color, display: 'flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle size={10} /> Selected — see details below
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function Module5Models() {
  const [apiModels,  setApiModels]  = useState<ModelCard[]>([]);
  const [selected,   setSelected]   = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<'all' | 'fast' | 'balanced' | 'powerful'>('all');
  const [provFilter, setProvFilter] = useState<string>('all');
  const [archPattern, setArchPattern] = useState<ArchResult | null>(null);
  const [dtStep,      setDtStep]      = useState(0);

  useEffect(() => { fetchModels().then(setApiModels).catch(() => {}); }, []);

  const providers = ['all', ...Array.from(new Set(MODELS.map(m => m.provider)))];
  const filtered  = MODELS.filter(m =>
    (tierFilter === 'all' || m.tier === tierFilter) &&
    (provFilter === 'all' || m.provider === provFilter)
  );
  const sel = MODELS.find(m => m.name === selected);

  const dtAnswer = (yes: boolean) => {
    const q = DT_QUESTIONS[dtStep];
    const next = yes ? q.yes : q.no;
    if (typeof next === 'string') {
      setArchPattern(next as ArchResult);
    } else {
      setDtStep(next);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1 — What is a foundation model?
          ══════════════════════════════════════════════════════════════ */}
      <section className="glass" style={{ padding: '26px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Cpu size={20} color="var(--pink)" />
          <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>Model Selection &amp; Architecture</h2>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20, maxWidth: 740 }}>
          A <strong style={{ color: 'var(--text-primary)' }}>foundation model</strong> is a large neural network trained on massive amounts of text (and sometimes images, code, and audio). Once trained, it can be adapted to many downstream tasks by providing a system prompt — no retraining needed. Understanding the model landscape lets you pick the right one for cost, quality, and speed.
        </p>
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <TheoryCard
            icon={<Layers size={15} />} accent="var(--blue)"
            title="How a foundation model is built"
            simple="Training happens in two phases. First, pre-training: the model reads trillions of tokens from the web, books, and code — learning language patterns, facts, and reasoning. Then, fine-tuning: it is further trained on human feedback to be helpful, harmless, and honest. You never touch the training — you only interact via the API."
            technical="Transformer architecture — self-attention layers that learn relationships between all tokens simultaneously. RLHF (Reinforcement Learning from Human Feedback) aligns model behaviour post-pretraining."
            visual={<FoundationModelDiagram />}
          />
          <TheoryCard
            icon={<Zap size={15} />} accent="var(--teal)"
            title="Bigger is not always better"
            simple="A Haiku-class model costs up to 90× less than Opus-class and responds in milliseconds. For classification, extraction, routing, or simple Q&A it often matches Opus quality at 1% of the price. Start small, benchmark, then scale up only if quality falls short."
            technical="Capability is measured by benchmark scores (MMLU, HumanEval, GPQA). But real-world performance depends on your specific task — always evaluate on your own data before choosing a model tier."
            visual={<ScaleBars />}
          />
        </div>
        <div className="grid-2">
          <TheoryCard
            icon={<Brain size={15} />} accent="var(--purple)"
            title="Context window — the model's working memory"
            simple="The context window is how much text the model can 'see' at once — your system prompt, conversation history, retrieved documents, and the current message all count against this limit. Claude models have 200K tokens (~150,000 words). Amazon Nova Pro has 300K. Exceeding the limit truncates earlier content."
            technical="1 token ≈ 0.75 English words. A 200K context window holds roughly 150K words or 500 pages of text. Cost scales linearly with tokens — long contexts significantly increase per-call cost."
          />
          <TheoryCard
            icon={<Server size={15} />} accent="var(--pink)"
            title="Model families on AWS Bedrock"
            simple="Bedrock hosts models from 6+ providers — Anthropic, Meta, Mistral, Amazon, Cohere, and AI21. Each has different strengths: Claude for reasoning and safety, Llama for open-weights fine-tuning, Nova for AWS-native integrations, Command R for RAG. The catalogue below shows all current options."
            technical="Access requires model enablement in your AWS account (Bedrock console → Model access). Cross-region inference profiles (us. prefix) route requests across AWS regions for higher throughput limits."
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2 — Full model catalogue
          ══════════════════════════════════════════════════════════════ */}
      <section className="glass" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Database size={17} color="var(--teal)" />
          <h3 style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>Model Catalogue — Bedrock 2025</h3>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginLeft: 4 }}>sourced from AWS Bedrock docs + Anthropic model overview</span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {(['all', 'fast', 'balanced', 'powerful'] as const).map(t => (
            <button key={t} onClick={() => setTierFilter(t)} className="btn btn-ghost"
              style={{ fontSize: 11.5, textTransform: 'capitalize', borderColor: tierFilter === t ? 'rgba(20,184,166,0.45)' : undefined, color: tierFilter === t ? 'var(--teal)' : undefined }}>
              {t}
            </button>
          ))}
          <span style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          {providers.map(p => (
            <button key={p} onClick={() => setProvFilter(p)} className="btn btn-ghost"
              style={{ fontSize: 11.5, textTransform: 'capitalize', borderColor: provFilter === p ? 'rgba(236,72,153,0.45)' : undefined, color: provFilter === p ? 'var(--pink)' : undefined }}>
              {p}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {filtered.map(m => (
            <ModelCardUI key={m.name} m={m} isSelected={selected === m.name} onClick={() => setSelected(selected === m.name ? null : m.name)} />
          ))}
        </div>

        {/* Selected model detail */}
        {sel && (
          <div style={{ marginTop: 18, padding: '18px 20px', background: `color-mix(in srgb, ${sel.color} 6%, rgba(255,255,255,0.02))`, border: `1px solid color-mix(in srgb, ${sel.color} 30%, transparent)`, borderRadius: 12, animation: 'fadeUp 0.25s ease' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: sel.color, marginBottom: 14 }}>{sel.name} — Full Profile</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Best for</div>
                {sel.bestFor.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, fontSize: 12 }}>
                    <CheckCircle size={11} color="var(--green)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{s}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Not ideal for</div>
                {sel.notFor.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, fontSize: 12 }}>
                    <XCircle size={11} color="var(--rose)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{s}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Bedrock model ID</div>
                <code style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: sel.color, background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: 6, display: 'block', wordBreak: 'break-all', lineHeight: 1.6 }}>{sel.bedrockId}</code>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3 — Selection decision guide
          ══════════════════════════════════════════════════════════════ */}
      <section className="glass" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <GitMerge size={17} color="var(--amber)" />
          <h3 style={{ fontWeight: 700, fontSize: 15 }}>How to choose a model — decision guide</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Question', 'If YES', 'If NO', 'Why it matters'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { q: 'Does the task need multi-step reasoning?',         yes: '→ Sonnet / Opus',      no: '→ Haiku / Nova Lite',  why: 'Smaller models handle simple tasks equally well at lower cost' },
                { q: 'Must it respond in under 500ms?',                  yes: '→ Haiku / Nova Lite',  no: '→ Any tier',           why: 'Haiku is ~5× faster than Opus for latency-sensitive apps' },
                { q: 'Processing 1,000+ requests/day at scale?',         yes: '→ Haiku / Llama',      no: '→ Sonnet',             why: 'Cost compounds — Sonnet at 10k calls/day costs ~$150/day output' },
                { q: 'Needs to read very long documents (>50K tokens)?', yes: '→ Nova Pro (300K)',     no: '→ Sonnet (200K)',      why: 'Nova Pro has the largest context window on Bedrock' },
                { q: 'Requires open weights for fine-tuning?',           yes: '→ Llama 3.3 / Mistral', no: '→ Any',              why: 'Closed models (Claude, Nova) cannot be fine-tuned locally' },
                { q: 'European data residency required?',                yes: '→ Mistral Large',       no: '→ Any',              why: 'Mistral is the only EU-HQ model family on Bedrock' },
                { q: 'Primary use case is RAG over documents?',          yes: '→ Command R+',          no: '→ Claude Sonnet',    why: 'Cohere Command R is specifically optimised for retrieval tasks' },
              ].map((r, i) => (
                <tr key={r.q} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.q}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--teal)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 11.5, whiteSpace: 'nowrap' }}>{r.yes}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11.5, whiteSpace: 'nowrap' }}>{r.no}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11.5, lineHeight: 1.5 }}>{r.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 4 — Architecture patterns + decision tree
          ══════════════════════════════════════════════════════════════ */}
      <section className="glass" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Layers size={17} color="var(--blue)" />
          <h3 style={{ fontWeight: 700, fontSize: 15 }}>Three architecture patterns</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.65 }}>
          Before writing a single line of code, decide which pattern fits your use case. Most production issues come from choosing the wrong architecture, not the wrong model.
        </p>

        {/* Three pattern cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          {(['direct', 'rag', 'agent'] as ArchResult[]).map(pat => {
            const info = ARCH_INFO[pat];
            const icon = pat === 'direct' ? <Zap size={18} /> : pat === 'rag' ? <Search size={18} /> : <Brain size={18} />;
            return (
              <div key={pat} style={{ padding: '16px 18px', background: `color-mix(in srgb, ${info.color} 7%, rgba(255,255,255,0.02))`, border: `1px solid color-mix(in srgb, ${info.color} 22%, transparent)`, borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in srgb, ${info.color} 16%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: info.color, flexShrink: 0 }}>{icon}</div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: info.color }}>{info.label}</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{info.desc}</p>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <strong style={{ color: info.color }}>Use when:</strong> {info.when}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '5px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontFamily: 'var(--font-mono)' }}>
                  {info.bedrock}
                </div>
                <ArchitecturePipeline pattern={pat} />
              </div>
            );
          })}
        </div>

        {/* Interactive decision tree */}
        <div style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>Which pattern do you need? — Interactive guide</div>
          {archPattern ? (
            <div style={{ animation: 'fadeUp 0.25s ease' }}>
              <div style={{ padding: '14px 16px', background: `color-mix(in srgb, ${ARCH_INFO[archPattern].color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${ARCH_INFO[archPattern].color} 28%, transparent)`, borderRadius: 9, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: ARCH_INFO[archPattern].color, marginBottom: 6 }}>
                  {archPattern === 'direct' ? <Zap size={14} style={{ display: 'inline', marginRight: 6 }} /> : archPattern === 'rag' ? <Search size={14} style={{ display: 'inline', marginRight: 6 }} /> : <Brain size={14} style={{ display: 'inline', marginRight: 6 }} />}
                  {ARCH_INFO[archPattern].label}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{ARCH_INFO[archPattern].desc}</p>
              </div>
              <button className="btn btn-ghost" onClick={() => { setArchPattern(null); setDtStep(0); }}>Start over</button>
            </div>
          ) : (
            <div style={{ animation: 'fadeUp 0.25s ease' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Question {dtStep + 1} of {DT_QUESTIONS.length}</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>{DT_QUESTIONS[dtStep].q}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={() => dtAnswer(true)} style={{ flex: 1 }}><CheckCircle size={13} /> Yes</button>
                <button className="btn btn-ghost" onClick={() => dtAnswer(false)} style={{ flex: 1 }}><XCircle size={13} /> No <ChevronRight size={12} /></button>
              </div>
            </div>
          )}
        </div>
      </section>

      <Callout variant="warning">
        <strong>Always document your model choice.</strong> Every production deployment should record: model ID + version, tier selection rationale, cost estimate at expected volume, latency SLA, context window utilisation, and data privacy classification.
      </Callout>
      </div> {/* end left column */}

      <GlossaryPanelM5 />
    </div>
  );
}
