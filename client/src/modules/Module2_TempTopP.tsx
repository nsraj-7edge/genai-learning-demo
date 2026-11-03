/**
 * Module 2 — Temperature, Top P & Top K
 *
 * Structure:
 *  1. What are these three? — plain-language intro with visual graphs
 *  2. How each one shapes the LLM output distribution (animated SVG charts)
 *  3. Value reference tables from docs
 *  4. Multi-run experiment — same prompt N times, side-by-side table
 */
import { useState, useCallback, useRef } from 'react';
import {
  Thermometer, Filter, Hash, BarChart2,
  Play, RefreshCw, ChevronDown, ChevronUp, Info, BookOpen,
} from 'lucide-react';
import { generate } from '../api/client';
import Callout from '../components/Callout';

// ─────────────────────────────────────────────────────────────────────────────
// Glossary
// ─────────────────────────────────────────────────────────────────────────────

const GLOSSARY_M2 = [
  {
    term: 'Temperature',
    color: 'var(--blue)',
    simple: 'A creativity dial. Low = predictable and consistent. High = varied and surprising.',
    technical: 'Scalar T that divides all logits before softmax. Low T steepens the distribution (one token dominates). High T flattens it (lower-ranked tokens gain real probability mass).',
  },
  {
    term: 'Top P (Nucleus Sampling)',
    color: 'var(--purple)',
    simple: 'Sort all tokens by probability. Keep accumulating until you hit P% of total. Only those tokens can be sampled.',
    technical: 'Sort vocab by prob desc, keep smallest set whose cumulative prob ≥ P, re-normalise, then sample. Dynamic vocab size — tight when distribution is peaked, wider when flat.',
  },
  {
    term: 'Top K',
    color: 'var(--teal)',
    simple: 'Keep exactly the top K most likely tokens. Everything else is zeroed out. Hard count, no exceptions.',
    technical: 'Hard cutoff — retain K tokens with highest logits regardless of probability gaps between them. Re-normalise and sample. Less adaptive than Top P.',
  },
  {
    term: 'Nucleus',
    color: 'var(--purple)',
    simple: 'The small group of tokens that survive the Top P filter — the "eligible candidates" for sampling.',
    technical: 'The set of tokens whose cumulative probability meets the threshold P. Named "nucleus" because it represents the dense core of the distribution.',
  },
  {
    term: 'Logit Scaling',
    color: 'var(--blue)',
    simple: 'What temperature actually does mathematically — it divides the raw scores before they become probabilities.',
    technical: 'logit_scaled = logit / T, then softmax applied. T<1 amplifies differences between logits. T>1 compresses them. T=1 is the raw model output.',
  },
  {
    term: 'Entropy',
    color: 'var(--amber)',
    simple: 'A measure of how spread out the probability distribution is. High entropy = flat = unpredictable. Low entropy = peaked = predictable.',
    technical: 'H = -Σ p(x) log p(x). High temperature increases entropy (flatter dist). Low temperature reduces it. Temperature = 1 gives the model\'s natural entropy.',
  },
  {
    term: 'Deterministic Output',
    color: 'var(--teal)',
    simple: 'Same prompt, same output, every single time. What you get at very low temperature.',
    technical: 'Achieved when temperature → 0 (greedy decoding / argmax). Every generation step picks the highest-probability token. No randomness — fully reproducible.',
  },
  {
    term: 'Stochastic Output',
    color: 'var(--rose)',
    simple: 'Same prompt, different output each run. What you get at higher temperature.',
    technical: 'Stochastic = random. At temperature > 0, sampling introduces randomness at every step. Two identical requests may produce completely different responses.',
  },
  {
    term: 'Consistency Score',
    color: 'var(--green)',
    simple: 'How similar outputs are across multiple runs of the same prompt. Near 100% = model always says the same thing.',
    technical: 'Heuristic metric: compare normalised first-60-chars of each run output. High score = low variance (expected at low T). Low score = high variance (expected at high T).',
  },
  {
    term: 'Do not change both',
    color: 'var(--amber)',
    simple: 'Change temperature OR Top P — never both at once. They both control randomness and fight each other.',
    technical: 'AWS Bedrock + Anthropic docs: "The general recommendation is to alter temperature or Top P but not both." Claude 4+ models via Bedrock will reject requests with both set to non-default values.',
  },
];

function GlossaryPanelM2() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div style={{
      width: 260, flexShrink: 0, position: 'sticky', top: 104,
      alignSelf: 'flex-start', maxHeight: 'calc(100vh - 120px)',
      overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10 }}>
        <BookOpen size={14} color="var(--purple)" />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--purple)' }}>Key Terms</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{GLOSSARY_M2.length} terms</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {GLOSSARY_M2.map(g => {
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
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RunResult {
  id: number;
  leftText:  string;
  rightText: string;
  leftMs:    number;
  rightMs:   number;
  status: 'pending' | 'loading' | 'done' | 'error';
  error?: string;
}

interface SideConfig {
  label: string;
  color: string;
  temperature: number;
  topP: number;
  topK: number;   // 0 = disabled
}

const DEFAULT_LEFT: SideConfig  = { label: 'Deterministic', color: 'var(--blue)',   temperature: 0.1, topP: 0.9, topK: 0 };
const DEFAULT_RIGHT: SideConfig = { label: 'Creative',      color: 'var(--purple)', temperature: 0.9, topP: 0.9, topK: 0 };

const TASKS = [
  {
    label: 'Story Opening',
    prompt: 'Write the opening paragraph of a mystery thriller set in a rainy city at midnight. Make it atmospheric and gripping.',
    why: 'Creative writing gives high temperature maximum room — each run produces a completely different scene, tone, and character.',
  },
  {
    label: 'Analogy',
    prompt: 'Explain how the internet works using a completely original analogy. Do not use the highway or post office analogy.',
    why: 'Forces the model to invent something new each time. Low temperature reuses the same analogy; high temperature generates surprising, varied ones.',
  },
  {
    label: 'Product Name',
    prompt: 'Invent 3 creative product names for a smart water bottle that tracks hydration. Include a one-line tagline for each.',
    why: 'Open-ended naming tasks show the widest variance — low temperature anchors on predictable names, high temperature invents unusual ones.',
  },
  {
    label: 'Factual (control)',
    prompt: 'What are the three laws of thermodynamics? State each law in one sentence.',
    why: 'Use as a control — even at high temperature factual content stays stable, showing temperature affects style more than facts.',
  },
  {
    label: 'Advice',
    prompt: 'Give someone one piece of unconventional life advice they have probably never heard before. Be specific and original.',
    why: '"Unconventional" pushes the model toward less common tokens. High temperature amplifies this into genuinely surprising advice each run.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Visual: token probability bar chart showing effect of each parameter
// ─────────────────────────────────────────────────────────────────────────────

// Simulated token probability data for the "next token after 'The sky is'"
const BASE_TOKENS = [
  { word: 'blue',      prob: 0.38 },
  { word: 'clear',     prob: 0.22 },
  { word: 'dark',      prob: 0.14 },
  { word: 'full',      prob: 0.09 },
  { word: 'bright',    prob: 0.07 },
  { word: 'vast',      prob: 0.05 },
  { word: 'electric',  prob: 0.03 },
  { word: 'trembling', prob: 0.015 },
  { word: 'ablaze',    prob: 0.008 },
  { word: 'weeping',   prob: 0.002 },
];

function applyTemperature(tokens: typeof BASE_TOKENS, temp: number) {
  if (temp === 0) return tokens.map((t, i) => ({ ...t, prob: i === 0 ? 1 : 0 }));
  // Scale logits by 1/temperature then re-normalise
  const t = Math.max(temp, 0.01);
  const logits = tokens.map(tk => Math.log(tk.prob) / t);
  const maxL = Math.max(...logits);
  const exps = logits.map(l => Math.exp(l - maxL));
  const sum = exps.reduce((a, b) => a + b, 0);
  return tokens.map((tk, i) => ({ ...tk, prob: exps[i] / sum }));
}

function applyTopP(tokens: typeof BASE_TOKENS, p: number) {
  // Sort by prob desc, keep cumulative until >= p, zero the rest
  const sorted = [...tokens].sort((a, b) => b.prob - a.prob);
  let cum = 0;
  const keep = new Set<string>();
  for (const t of sorted) {
    cum += t.prob;
    keep.add(t.word);
    if (cum >= p) break;
  }
  const filtered = tokens.map(t => ({ ...t, prob: keep.has(t.word) ? t.prob : 0 }));
  const sum = filtered.reduce((a, b) => a + b.prob, 0);
  return filtered.map(t => ({ ...t, prob: sum > 0 ? t.prob / sum : 0 }));
}

function applyTopK(tokens: typeof BASE_TOKENS, k: number) {
  const sorted = [...tokens].sort((a, b) => b.prob - a.prob);
  const keepWords = new Set(sorted.slice(0, k).map(t => t.word));
  const filtered = tokens.map(t => ({ ...t, prob: keepWords.has(t.word) ? t.prob : 0 }));
  const sum = filtered.reduce((a, b) => a + b.prob, 0);
  return filtered.map(t => ({ ...t, prob: sum > 0 ? t.prob / sum : 0 }));
}

function ProbabilityBars({
  tokens, color, highlight,
}: { tokens: typeof BASE_TOKENS; color: string; highlight?: string }) {
  const max = Math.max(...tokens.map(t => t.prob));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {tokens.map(t => {
        const pct = max > 0 ? (t.prob / max) * 100 : 0;
        const isZero = t.prob < 0.001;
        const isTop = t.word === tokens.reduce((a, b) => a.prob > b.prob ? a : b).word;
        return (
          <div key={t.word} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: isZero ? 0.22 : 1 }}>
            <div style={{
              width: 68, fontSize: 11, textAlign: 'right', flexShrink: 0,
              color: isTop ? color : 'var(--text-muted)',
              fontWeight: isTop ? 700 : 400,
              fontFamily: 'var(--font-mono)',
            }}>{t.word}</div>
            <div style={{ flex: 1, height: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: isZero ? 'rgba(255,255,255,0.08)' : `color-mix(in srgb, ${color} ${isTop ? 90 : 55}%, transparent)`,
                borderRadius: 3,
                transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: isTop && !isZero ? `0 0 8px color-mix(in srgb, ${color} 40%, transparent)` : 'none',
              }} />
            </div>
            <div style={{
              width: 42, fontSize: 10.5, textAlign: 'right', flexShrink: 0,
              color: isZero ? 'var(--text-muted)' : color, fontFamily: 'var(--font-mono)',
            }}>
              {isZero ? '—' : `${(t.prob * 100).toFixed(1)}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Interactive visualiser for a single parameter
function ParamVisualiser({
  param, color, icon: Icon,
}: {
  param: 'temperature' | 'topP' | 'topK';
  color: string;
  icon: React.ElementType;
}) {
  const [val, setVal] = useState(param === 'temperature' ? 0.7 : param === 'topP' ? 0.9 : 5);

  const config = {
    temperature: { min: 0.01, max: 1, step: 0.01, label: 'Temperature', unit: '', fmt: (v: number) => v.toFixed(2) },
    topP:        { min: 0.05, max: 1, step: 0.01, label: 'Top P',        unit: '', fmt: (v: number) => v.toFixed(2) },
    topK:        { min: 1,    max: 10, step: 1,   label: 'Top K',        unit: '', fmt: (v: number) => `${v}` },
  }[param];

  let processed = applyTemperature(BASE_TOKENS, 0.7); // base: moderate temp
  if (param === 'temperature') processed = applyTemperature(BASE_TOKENS, val);
  if (param === 'topP')        processed = applyTopP(applyTemperature(BASE_TOKENS, 0.7), val);
  if (param === 'topK')        processed = applyTopK(applyTemperature(BASE_TOKENS, 0.7), val);

  const activeCount = processed.filter(t => t.prob > 0.001).length;

  return (
    <div className="glass-sm" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <Icon size={14} color={color} />
        <span style={{ fontWeight: 700, fontSize: 13, color }}>{config.label}</span>
        <span style={{
          marginLeft: 'auto',
          background: `color-mix(in srgb, ${color} 14%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
          color, borderRadius: 99, padding: '1px 10px',
          fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-mono)',
        }}>{config.fmt(val)}</span>
      </div>

      <input type="range" min={config.min} max={config.max} step={config.step} value={val}
        style={{ accentColor: color, marginBottom: 10 }}
        onChange={e => setVal(parseFloat(e.target.value))} />

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textAlign: 'right' }}>
        {activeCount} token{activeCount !== 1 ? 's' : ''} eligible to be sampled
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Next-token probabilities after "The sky is"
      </div>
      <ProbabilityBars tokens={processed} color={color} />

      {/* Contextual hint */}
      <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 7, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>
        {param === 'temperature' && (
          val < 0.3 ? '"blue" dominates — near-deterministic output. The model will almost always pick this word.'
          : val < 0.65 ? 'Moderate spread — the top few tokens compete. Some variation between runs.'
          : 'Flattened distribution — rare words like "electric" and "trembling" now have a real chance of being picked.'
        )}
        {param === 'topP' && (
          val < 0.5 ? `Tight nucleus — only the top ${activeCount} tokens survive. High consistency.`
          : val < 0.85 ? `Moderate nucleus — ${activeCount} tokens in play. Balances quality and variety.`
          : `Wide nucleus — ${activeCount} tokens eligible. Full vocabulary range.`
        )}
        {param === 'topK' && (
          val <= 2 ? `Only ${val} token${val > 1 ? 's' : ''} survive — very constrained. Hard cutoff regardless of probability gaps.`
          : val <= 5 ? `Top ${val} tokens survive — good balance of quality and variety.`
          : `Top ${val} tokens — wide selection. Less filtering than tight nucleus sampling.`
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Value reference tables
// ─────────────────────────────────────────────────────────────────────────────

function GuideTable({ rows, color }: {
  rows: { range: string; effect: string; when: string; src: string }[];
  color: string;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 1fr', gap: 1, borderRadius: 8, overflow: 'hidden' }}>
      {['Value', 'Effect', 'Best for', 'Source'].map(h => (
        <div key={h} style={{ background: 'rgba(255,255,255,0.08)', padding: '6px 10px', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
      ))}
      {rows.map((r, i) => (
        <>
          <div key={`${i}a`} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent', padding: '6px 10px', fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{r.range}</div>
          <div key={`${i}b`} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent', padding: '6px 10px', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.effect}</div>
          <div key={`${i}c`} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent', padding: '6px 10px', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.when}</div>
          <div key={`${i}d`} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent', padding: '6px 10px', fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>{r.src}</div>
        </>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sliders for experiment panel
// ─────────────────────────────────────────────────────────────────────────────

function ParamSlider({ label, value, onChange, min, max, step, color, disabled, isInt }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; color: string; disabled: boolean; isInt?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{
          background: `color-mix(in srgb, ${color} 14%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
          color, borderRadius: 99, padding: '1px 9px',
          fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
        }}>{isInt ? value === 0 ? 'off' : String(value) : value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        disabled={disabled} style={{ accentColor: color }}
        onChange={e => onChange(isInt ? parseInt(e.target.value) : parseFloat(e.target.value))} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Results table row
// ─────────────────────────────────────────────────────────────────────────────

function ResultRow({ run, leftColor, rightColor }: { run: RunResult; leftColor: string; rightColor: string }) {
  const [expanded, setExpanded] = useState(false);
  const TRUNC = 200;

  const cell = (text: string, color: string, ms: number) => {
    const long = text.length > TRUNC;
    return (
      <td style={{ padding: '10px 12px', verticalAlign: 'top', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {run.status === 'loading' ? (
          <div>
            <div className="skeleton" style={{ height: 10, width: '88%', marginBottom: 5, borderRadius: 3 }} />
            <div className="skeleton" style={{ height: 10, width: '72%', marginBottom: 5, borderRadius: 3 }} />
            <div className="skeleton" style={{ height: 10, width: '55%', borderRadius: 3 }} />
          </div>
        ) : run.status === 'error' ? (
          <span style={{ color: 'var(--rose)', fontSize: 12 }}>Error: {run.error}</span>
        ) : (
          <div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-primary)' }}>
              {expanded || !long ? text : text.slice(0, TRUNC) + '…'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              {long && (
                <button onClick={() => setExpanded(v => !v)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 11,
                  display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font)',
                }}>
                  {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  {expanded ? 'Collapse' : 'Expand'}
                </button>
              )}
              {ms > 0 && (
                <span style={{ fontSize: 10.5, color: `color-mix(in srgb, ${color} 70%, var(--text-muted))`, marginLeft: 'auto' }}>
                  {ms}ms
                </span>
              )}
            </div>
          </div>
        )}
      </td>
    );
  };

  return (
    <tr>
      <td style={{
        padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle',
        borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, fontWeight: 700,
        color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: 48,
      }}>{run.id}</td>
      {cell(run.leftText, leftColor, run.leftMs)}
      {cell(run.rightText, rightColor, run.rightMs)}
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Consistency score
// ─────────────────────────────────────────────────────────────────────────────

function consistencyScore(texts: string[]): number {
  const done = texts.filter(t => t.length > 0);
  if (done.length < 2) return 0;
  const norm = done.map(t => t.toLowerCase().trim().slice(0, 60));
  const unique = new Set(norm).size;
  return Math.round(((done.length - unique + 1) / done.length) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function Module2TempTopP() {
  const [task,    setTask]    = useState(TASKS[0]);
  const [prompt,  setPrompt]  = useState(TASKS[0].prompt);
  const [showWhy, setShowWhy] = useState(true);
  const [numRuns, setNumRuns] = useState(5);
  const [left,    setLeft]    = useState<SideConfig>({ ...DEFAULT_LEFT });
  const [right,   setRight]   = useState<SideConfig>({ ...DEFAULT_RIGHT });
  const [runs,    setRuns]    = useState<RunResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');
  const abortRef = useRef(false);

  const updateRun = (id: number, patch: Partial<RunResult>) =>
    setRuns(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const runAll = useCallback(async () => {
    abortRef.current = false;
    setError('');
    setDone(false);
    setRunning(true);

    const initial: RunResult[] = Array.from({ length: numRuns }, (_, i) => ({
      id: i + 1, leftText: '', rightText: '', leftMs: 0, rightMs: 0, status: 'pending',
    }));
    setRuns(initial);

    for (let i = 0; i < numRuns; i++) {
      if (abortRef.current) break;
      updateRun(i + 1, { status: 'loading' });
      try {
        const res = await generate({
          prompt,
          maxTokens: 250,
          mode: 'compare',
          temperature: left.temperature,
          topP: left.topP,
          topK: left.topK,
          compareWith: { temperature: right.temperature, topP: right.topP, topK: right.topK },
        });
        if (res.mode === 'compare') {
          updateRun(i + 1, {
            status: 'done',
            leftText:  res.left.text,
            rightText: res.right.text,
            leftMs:    res.left.latencyMs,
            rightMs:   res.right.latencyMs,
          });
        }
      } catch (e: unknown) {
        updateRun(i + 1, {
          status: 'error',
          error:  e instanceof Error ? e.message : 'Request failed',
        });
      }
      if (i < numRuns - 1) await new Promise(r => setTimeout(r, 400));
    }

    setRunning(false);
    setDone(true);
  }, [prompt, numRuns, left, right]);

  const stop = () => { abortRef.current = true; setRunning(false); };

  const completedRuns = runs.filter(r => r.status === 'done');
  const leftScore  = consistencyScore(completedRuns.map(r => r.leftText));
  const rightScore = consistencyScore(completedRuns.map(r => r.rightText));

  const warnBoth = (left.temperature !== 1.0 && left.topP !== 1.0 && left.topP < 0.85 && left.temperature > 0.6) ||
                   (right.temperature !== 1.0 && right.topP !== 1.0 && right.topP < 0.85 && right.temperature > 0.6);
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

      {/* ── Left: module content ──────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1 — What are Temperature, Top P & Top K?
          ══════════════════════════════════════════════════════════════ */}
      <section className="glass" style={{ padding: '26px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Thermometer size={20} color="var(--purple)" />
          <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>
            Temperature, Top P &amp; Top K
          </h2>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20, maxWidth: 720 }}>
          When an LLM generates text it does <strong style={{ color: 'var(--text-primary)' }}>not</strong> simply pick the most likely next word every time. Instead, it builds a probability distribution over its entire vocabulary — tens of thousands of possible tokens — and then <em>samples</em> from that distribution. Temperature, Top P, and Top K are three knobs that control <strong style={{ color: 'var(--text-primary)' }}>how that sampling happens</strong>.
        </p>

        {/* Three-card overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            {
              Icon: Thermometer, color: 'var(--blue)', label: 'Temperature',
              tagline: 'Reshapes the distribution',
              plain: 'Think of it as a creativity dial. Turn it down and the model confidently picks the most likely word. Turn it up and it becomes willing to gamble on surprising, less-common words.',
              technical: 'Divides all logits by T before softmax. Low T sharpens the peak; high T flattens the curve — increasing entropy.',
            },
            {
              Icon: Filter, color: 'var(--purple)', label: 'Top P',
              tagline: 'Filters by cumulative probability',
              plain: 'Imagine ranking all words by likelihood, then drawing an invisible line once you\'ve covered P% of the total probability. Only words above that line are eligible to be picked.',
              technical: 'Nucleus sampling. Sort tokens by prob descending, keep the smallest set whose cumulative prob ≥ P. Re-normalise and sample.',
            },
            {
              Icon: Hash, color: 'var(--teal)', label: 'Top K',
              tagline: 'Filters by a hard count',
              plain: 'Simpler than Top P: just keep the K most likely words, throw away everything else. If K=5, only the 5 top candidates can ever be chosen.',
              technical: 'Hard cutoff — keep the K tokens with highest logits regardless of probability gaps. Re-normalise and sample from those K.',
            },
          ].map(({ Icon, color, label, tagline, plain, technical }) => (
            <div key={label} className="glass-sm" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: `color-mix(in srgb, ${color} 16%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={15} color={color} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tagline}</div>
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 10 }}>
                {plain}
              </p>
              <div style={{ padding: '7px 9px', background: `color-mix(in srgb, ${color} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`, borderRadius: 7, fontSize: 11.5, color: `color-mix(in srgb, ${color} 85%, var(--text-secondary))`, lineHeight: 1.55 }}>
                <strong>Technical:</strong> {technical}
              </div>
            </div>
          ))}
        </div>

        {/* Why they matter */}
        <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <Info size={13} color="var(--teal)" />
            <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--teal)' }}>Why do these matter in production?</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Reproducibility', text: 'For APIs that feed downstream code (JSON extraction, SQL generation, classification), you need the same answer every time. Temperature near 0 guarantees this.' },
              { label: 'Creativity vs. Safety', text: 'For chatbots, marketing copy, or story generation, some randomness is desirable. But too much produces hallucinations and incoherent output.' },
              { label: 'Cost & Latency', text: 'These params don\'t affect cost or speed. But getting them wrong forces retries — which does. Set them right the first time.' },
            ].map(b => (
              <div key={b.label}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{b.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{b.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          VISUAL COMPARISON — Temperature vs Top P vs Top K
          ══════════════════════════════════════════════════════════════ */}
      <section className="glass" style={{ padding: '22px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
          <BarChart2 size={16} color="var(--teal)" />
          <h3 style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>
            Visual comparison — same 7 tokens, three different controls
          </h3>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.6 }}>
          Context: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: 12 }}>"The sky is ___"</strong> — bars show relative probability of each next token under different settings.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

          {/* ── Temperature ── */}
          <div className="glass-sm" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <Thermometer size={14} color="var(--blue)" />
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue)' }}>Temperature</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 'auto' }}>reshapes everything</span>
            </div>

            {/* Low temp */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--blue)', marginBottom: 7 }}>T = 0.1 — Peaked</div>
              {[
                { w: 'blue',     p: 94 },
                { w: 'clear',    p: 4  },
                { w: 'dark',     p: 1  },
                { w: 'vast',     p: 1  },
                { w: 'electric', p: 0  },
                { w: 'wild',     p: 0  },
              ].map((t, i) => (
                <div key={t.w} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <span style={{ width: 46, fontSize: 10, fontFamily: 'var(--font-mono)', color: i === 0 ? 'var(--blue)' : 'var(--text-muted)', flexShrink: 0, fontWeight: i === 0 ? 700 : 400 }}>{t.w}</span>
                  <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${t.p}%`, background: i === 0 ? 'var(--blue)' : `rgba(59,130,246,${Math.max(0.08, 0.4 - i * 0.07)})`, borderRadius: 2 }} />
                  </div>
                  <span style={{ width: 26, fontSize: 9.5, fontFamily: 'var(--font-mono)', color: i === 0 ? 'var(--blue)' : 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{t.p > 0 ? `${t.p}%` : '—'}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'rgba(59,130,246,0.6)', marginTop: 5 }}>"blue" almost always wins</div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 14 }} />

            {/* High temp */}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--rose)', marginBottom: 7 }}>T = 0.9 — Flat</div>
              {[
                { w: 'blue',     p: 32 },
                { w: 'clear',    p: 24 },
                { w: 'dark',     p: 18 },
                { w: 'vast',     p: 12 },
                { w: 'electric', p: 8  },
                { w: 'wild',     p: 6  },
              ].map((t, i) => (
                <div key={t.w} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <span style={{ width: 46, fontSize: 10, fontFamily: 'var(--font-mono)', color: i === 0 ? 'var(--rose)' : 'var(--text-muted)', flexShrink: 0 }}>{t.w}</span>
                  <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${t.p}%`, background: `rgba(244,63,94,${0.3 + (6 - i) * 0.1})`, borderRadius: 2 }} />
                  </div>
                  <span style={{ width: 26, fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--rose)', textAlign: 'right', flexShrink: 0 }}>{t.p}%</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'rgba(244,63,94,0.6)', marginTop: 5 }}>All tokens compete — "electric" has a real shot</div>
            </div>

            <div style={{ marginTop: 12, padding: '7px 9px', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 7, fontSize: 11, color: 'rgba(59,130,246,0.85)', lineHeight: 1.55 }}>
              Temperature changes every bar — the whole distribution shifts.
            </div>
          </div>

          {/* ── Top P ── */}
          <div className="glass-sm" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <Filter size={14} color="var(--purple)" />
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--purple)' }}>Top P</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 'auto' }}>filters by % mass</span>
            </div>

            {/* P = 0.5 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--purple)', marginBottom: 4 }}>P = 0.50 — Tight nucleus</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 7 }}>Accumulate until 50% covered → stop</div>
              {[
                { w: 'blue',     p: 38, kept: true  },
                { w: 'clear',    p: 22, kept: true  },
                { w: 'dark',     p: 0,  kept: false },
                { w: 'vast',     p: 0,  kept: false },
                { w: 'electric', p: 0,  kept: false },
                { w: 'wild',     p: 0,  kept: false },
              ].map((t, i) => (
                <div key={t.w} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, opacity: t.kept ? 1 : 0.25 }}>
                  <span style={{ width: 46, fontSize: 10, fontFamily: 'var(--font-mono)', color: t.kept ? 'var(--purple)' : 'var(--text-muted)', flexShrink: 0 }}>{t.w}</span>
                  <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${t.p}%`, background: t.kept ? `rgba(139,92,246,${0.7 - i * 0.1})` : 'rgba(255,255,255,0.08)', borderRadius: 2 }} />
                  </div>
                  <span style={{ width: 26, fontSize: 9.5, fontFamily: 'var(--font-mono)', color: t.kept ? 'var(--purple)' : 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{t.p > 0 ? `${t.p}%` : '✕'}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'rgba(139,92,246,0.6)', marginTop: 5 }}>Only 2 tokens survive — tight, consistent</div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 14 }} />

            {/* P = 0.9 */}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--purple)', marginBottom: 4 }}>P = 0.90 — Wide nucleus</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 7 }}>Accumulate until 90% covered → stop</div>
              {[
                { w: 'blue',     p: 38, kept: true  },
                { w: 'clear',    p: 22, kept: true  },
                { w: 'dark',     p: 14, kept: true  },
                { w: 'vast',     p: 9,  kept: true  },
                { w: 'electric', p: 7,  kept: true  },
                { w: 'wild',     p: 0,  kept: false },
              ].map((t, i) => (
                <div key={t.w} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, opacity: t.kept ? 1 : 0.25 }}>
                  <span style={{ width: 46, fontSize: 10, fontFamily: 'var(--font-mono)', color: t.kept ? 'var(--purple)' : 'var(--text-muted)', flexShrink: 0 }}>{t.w}</span>
                  <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${t.p}%`, background: t.kept ? `rgba(139,92,246,${0.7 - i * 0.08})` : 'rgba(255,255,255,0.08)', borderRadius: 2 }} />
                  </div>
                  <span style={{ width: 26, fontSize: 9.5, fontFamily: 'var(--font-mono)', color: t.kept ? 'var(--purple)' : 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{t.p > 0 ? `${t.p}%` : '✕'}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'rgba(139,92,246,0.6)', marginTop: 5 }}>5 tokens survive — more variety</div>
            </div>

            <div style={{ marginTop: 12, padding: '7px 9px', background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 7, fontSize: 11, color: 'rgba(139,92,246,0.85)', lineHeight: 1.55 }}>
              Top P doesn't change probabilities — it cuts the tail. Faded bars = eliminated.
            </div>
          </div>

          {/* ── Top K ── */}
          <div className="glass-sm" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <Hash size={14} color="var(--teal)" />
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--teal)' }}>Top K</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 'auto' }}>hard count cutoff</span>
            </div>

            {/* K = 2 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--teal)', marginBottom: 4 }}>K = 2 — Strict</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 7 }}>Keep top 2 tokens, discard all others</div>
              {[
                { w: 'blue',     p: 38, kept: true  },
                { w: 'clear',    p: 22, kept: true  },
                { w: 'dark',     p: 0,  kept: false },
                { w: 'vast',     p: 0,  kept: false },
                { w: 'electric', p: 0,  kept: false },
                { w: 'wild',     p: 0,  kept: false },
              ].map((t, i) => (
                <div key={t.w} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, opacity: t.kept ? 1 : 0.25 }}>
                  <span style={{ width: 46, fontSize: 10, fontFamily: 'var(--font-mono)', color: t.kept ? 'var(--teal)' : 'var(--text-muted)', flexShrink: 0 }}>{t.w}</span>
                  <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${t.p}%`, background: t.kept ? `rgba(20,184,166,${0.75 - i * 0.1})` : 'rgba(255,255,255,0.08)', borderRadius: 2 }} />
                  </div>
                  <span style={{ width: 26, fontSize: 9.5, fontFamily: 'var(--font-mono)', color: t.kept ? 'var(--teal)' : 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{t.p > 0 ? `${t.p}%` : '✕'}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'rgba(20,184,166,0.6)', marginTop: 5 }}>Exactly 2 tokens — always, no exceptions</div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 14 }} />

            {/* K = 5 */}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--teal)', marginBottom: 4 }}>K = 5 — Wider</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 7 }}>Keep top 5 tokens, discard all others</div>
              {[
                { w: 'blue',     p: 38, kept: true  },
                { w: 'clear',    p: 22, kept: true  },
                { w: 'dark',     p: 14, kept: true  },
                { w: 'vast',     p: 9,  kept: true  },
                { w: 'electric', p: 7,  kept: true  },
                { w: 'wild',     p: 0,  kept: false },
              ].map((t, i) => (
                <div key={t.w} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, opacity: t.kept ? 1 : 0.25 }}>
                  <span style={{ width: 46, fontSize: 10, fontFamily: 'var(--font-mono)', color: t.kept ? 'var(--teal)' : 'var(--text-muted)', flexShrink: 0 }}>{t.w}</span>
                  <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${t.p}%`, background: t.kept ? `rgba(20,184,166,${0.75 - i * 0.08})` : 'rgba(255,255,255,0.08)', borderRadius: 2 }} />
                  </div>
                  <span style={{ width: 26, fontSize: 9.5, fontFamily: 'var(--font-mono)', color: t.kept ? 'var(--teal)' : 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{t.p > 0 ? `${t.p}%` : '✕'}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'rgba(20,184,166,0.6)', marginTop: 5 }}>Exactly 5 tokens — always, regardless of gaps</div>
            </div>

            <div style={{ marginTop: 12, padding: '7px 9px', background: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.2)', borderRadius: 7, fontSize: 11, color: 'rgba(20,184,166,0.85)', lineHeight: 1.55 }}>
              Top K is a hard count. It doesn't care about probability gaps — just position.
            </div>
          </div>
        </div>

        {/* Key difference callout */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Temperature', color: 'var(--blue)',   text: 'Changes ALL bars — reshapes the entire distribution before any filtering.' },
            { label: 'Top P',       color: 'var(--purple)', text: 'Cuts the tail by cumulative % — the nucleus size adapts to the distribution shape.' },
            { label: 'Top K',       color: 'var(--teal)',   text: 'Cuts by position — always exactly K survivors, no matter the gaps.' },
          ].map(c => (
            <div key={c.label} style={{ padding: '9px 12px', background: `color-mix(in srgb, ${c.color} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${c.color} 22%, transparent)`, borderRadius: 8, fontSize: 11.5, lineHeight: 1.55 }}>
              <strong style={{ color: c.color }}>{c.label}: </strong>
              <span style={{ color: 'var(--text-muted)' }}>{c.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2 — Interactive probability visualiser
          ══════════════════════════════════════════════════════════════ */}
      <section className="glass" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
          <BarChart2 size={17} color="var(--teal)" />
          <h3 style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
            How each parameter shapes the output distribution
          </h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.65 }}>
          The bars below show the probability of each next-token candidate after <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>"The sky is"</strong>. Drag each slider and watch what happens to the distribution in real time.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <ParamVisualiser param="temperature" color="var(--blue)"   icon={Thermometer} />
          <ParamVisualiser param="topP"        color="var(--purple)" icon={Filter}      />
          <ParamVisualiser param="topK"        color="var(--teal)"   icon={Hash}        />
        </div>

        <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 9, fontSize: 12.5, color: 'rgba(245,158,11,0.9)', lineHeight: 1.65 }}>
          <strong>Key insight:</strong> Temperature reshapes the <em>entire</em> distribution — it affects every token's probability. Top P and Top K are <em>filters</em> — they cut off the tail after the distribution is set, then re-normalise. In practice, Temperature is the most important knob. Change Top P or Top K only when you have a specific reason.
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3 — Value reference tables
          ══════════════════════════════════════════════════════════════ */}
      <section className="glass" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
          <Info size={16} color="var(--blue)" />
          <h3 style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>Value reference — what to use when</h3>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginLeft: 4 }}>sourced from AWS Bedrock, Anthropic API docs &amp; Prompt Engineering Guide</span>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Thermometer size={13} color="var(--blue)" />
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue)' }}>Temperature</span>
          </div>
          <GuideTable color="var(--blue)" rows={[
            { range: '0.0 – 0.2', effect: 'Near-deterministic. Almost always picks the highest-probability token.',        when: 'Fact-based Q&A, data extraction, structured output, code generation, maths.', src: 'AWS Bedrock' },
            { range: '0.3 – 0.6', effect: 'Balanced. Some variation between runs but generally consistent.',               when: 'Summarisation, classification, general-purpose assistants.',                src: 'Prompt Eng. Guide' },
            { range: '0.7 – 0.9', effect: 'Creative. Noticeable variation; less likely words get real chances.',          when: 'Creative writing, brainstorming, marketing copy, story generation.',         src: 'Anthropic docs' },
            { range: '1.0',       effect: 'Full model entropy — raw output before any sharpening. High randomness.',       when: 'Research / exploration only. Not recommended for production.',               src: 'AWS Bedrock' },
          ]} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Filter size={13} color="var(--purple)" />
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--purple)' }}>Top P</span>
          </div>
          <GuideTable color="var(--purple)" rows={[
            { range: '0.1 – 0.3',     effect: 'Tiny nucleus. Only the very top tokens are eligible.',                    when: 'Safety-critical outputs, maximum consistency, tightly constrained tasks.', src: 'AWS Bedrock' },
            { range: '0.5 – 0.7',     effect: 'Moderate nucleus. Decent vocabulary range.',                              when: 'When 0.9 feels too random but you still want some variation.',             src: 'Prompt Eng. Guide' },
            { range: '0.9 (default)', effect: 'Standard. Nearly all likely tokens are eligible.',                        when: 'Works for most tasks. Change only when you have a specific reason.',        src: 'Anthropic docs' },
            { range: '1.0',           effect: 'No nucleus filtering. Full vocabulary always eligible.',                   when: 'Equivalent to disabling Top P — rarely useful.',                           src: 'AWS Bedrock' },
          ]} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Hash size={13} color="var(--teal)" />
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--teal)' }}>Top K</span>
          </div>
          <GuideTable color="var(--teal)" rows={[
            { range: '1',     effect: 'Greedy decoding — always picks the single most likely token.',          when: 'Maximum determinism. Equivalent to temperature ≈ 0.',                        src: 'AWS Bedrock' },
            { range: '5 – 10', effect: 'Small but meaningful candidate pool. Good quality-variety balance.', when: 'Code, structured tasks, factual Q&A.',                                      src: 'Prompt Eng. Guide' },
            { range: '40 – 50', effect: 'Large pool — the common default in many open-source models.',       when: 'General generation. Often used alongside Top P (whichever is tighter wins).', src: 'Anthropic docs' },
            { range: '0 / off', effect: 'Top K disabled. Only Top P limits the vocabulary.',                 when: 'Recommended when using Claude via Bedrock — let Top P do the filtering.',    src: 'AWS Bedrock' },
          ]} />
        </div>

        <Callout variant="warning">
          <strong>Golden rule — change only one at a time.</strong> The Prompt Engineering Guide states: "The general recommendation is to alter temperature or Top P but not both." Many Claude models via AWS Bedrock reject requests where both temperature and Top P are set to non-default values simultaneously. Top K is a secondary filter — use it only in open-source / self-hosted model contexts.
        </Callout>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 4 — Multi-run experiment
          ══════════════════════════════════════════════════════════════ */}
      <section className="glass" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <BarChart2 size={17} color="var(--teal)" />
          <h3 style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
            Multi-Run Experiment
          </h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.65 }}>
          Run the <strong style={{ color: 'var(--text-primary)' }}>exact same prompt</strong> N times through two different temperature settings and compare every output side by side. Watch how the Deterministic column stays consistent while the Creative column varies.
        </p>

        {/* Prompt presets */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 7 }}>
            Choose a prompt designed to make the difference obvious:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TASKS.map(t => (
              <button key={t.label}
                onClick={() => { setTask(t); setPrompt(t.prompt); setShowWhy(true); }}
                className="btn btn-ghost"
                style={{
                  fontSize: 12,
                  borderColor: task.label === t.label ? 'rgba(20,184,166,0.45)' : undefined,
                  color:       task.label === t.label ? 'var(--teal)'           : undefined,
                  background:  task.label === t.label ? 'rgba(20,184,166,0.08)' : undefined,
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {showWhy && task.why && (
          <div style={{
            marginBottom: 10, padding: '9px 13px',
            background: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.22)',
            borderRadius: 8, fontSize: 12, color: 'rgba(20,184,166,0.9)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
            <span><strong>Why this prompt:</strong> {task.why}</span>
          </div>
        )}

        <textarea className="glass-input" rows={3} value={prompt}
          onChange={e => { setPrompt(e.target.value); setShowWhy(false); }}
          disabled={running}
          placeholder="Prompt to run through both settings…"
          style={{ marginBottom: 16 }} />

        {/* Side-by-side settings */}
        <div className="grid-2" style={{ marginBottom: 16 }}>
          {([
            { side: left,  setSide: setLeft,  accent: left.color  },
            { side: right, setSide: setRight, accent: right.color },
          ] as const).map(({ side, setSide, accent }) => (
            <div key={side.label} className="glass-sm" style={{ padding: '16px 18px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                paddingBottom: 10, borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: accent, boxShadow: `0 0 10px ${accent}` }} />
                <span style={{ fontWeight: 700, color: accent, fontSize: 13.5 }}>{side.label}</span>
              </div>

              <ParamSlider label="Temperature" value={side.temperature} min={0} max={1} step={0.01}
                color={accent} disabled={running}
                onChange={v => setSide(s => ({ ...s, temperature: v }))} />

              <ParamSlider label="Top P" value={side.topP} min={0.01} max={1} step={0.01}
                color={accent} disabled={running}
                onChange={v => setSide(s => ({ ...s, topP: v }))} />

              <ParamSlider label="Top K (0 = off)" value={side.topK} min={0} max={50} step={1}
                color={accent} disabled={running} isInt
                onChange={v => setSide(s => ({ ...s, topK: v }))} />

              {/* Status summary */}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>
                <span style={{ color: accent, fontWeight: 600 }}>T={side.temperature.toFixed(2)}</span>
                {' — '}
                {side.temperature < 0.3 ? 'Near-deterministic' : side.temperature < 0.65 ? 'Balanced' : side.temperature < 0.85 ? 'Creative' : 'Very random'}
                {' · '}
                <span style={{ color: accent, fontWeight: 600 }}>P={side.topP.toFixed(2)}</span>
                {' — '}
                {side.topP < 0.4 ? 'tiny nucleus' : side.topP < 0.75 ? 'moderate nucleus' : 'wide nucleus'}
                {' · '}
                <span style={{ color: accent, fontWeight: 600 }}>K={side.topK === 0 ? 'off' : side.topK}</span>
                {side.topK > 0 ? ` — top ${side.topK} tokens only` : ' — no hard cutoff'}
              </div>
            </div>
          ))}
        </div>

        {warnBoth && (
          <div style={{ marginBottom: 14 }}>
            <Callout variant="warning">Both Temperature and Top P are non-default on one panel. Best practice: change only one.</Callout>
          </div>
        )}

        {/* Number of runs */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Number of runs <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(1 – 20)</span>
            </span>
            <span style={{
              background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)',
              color: 'var(--teal)', borderRadius: 99, padding: '2px 12px',
              fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)',
            }}>{numRuns}</span>
          </div>
          <input type="range" min={1} max={20} step={1} value={numRuns}
            style={{ accentColor: 'var(--teal)' }} disabled={running}
            onChange={e => setNumRuns(parseInt(e.target.value))} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            <span>1 run — quick check</span>
            <span>20 runs — strong statistical view</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={runAll}
            disabled={running || !prompt.trim()}
            style={{ padding: '10px 28px', fontSize: 14 }}>
            <Play size={13} />
            {running
              ? `Running… (${completedRuns.length}/${numRuns} done)`
              : `Run ${numRuns} time${numRuns > 1 ? 's' : ''} through both`}
          </button>
          {running && (
            <button className="btn btn-ghost" onClick={stop}>Stop</button>
          )}
          {done && !running && (
            <button className="btn btn-ghost" onClick={() => { setRuns([]); setDone(false); }}>
              <RefreshCw size={12} /> Clear
            </button>
          )}
        </div>
        {error && <div style={{ marginTop: 12 }}><Callout variant="danger">{error}</Callout></div>}
      </section>

      {/* ── Results table ─────────────────────────────────────────── */}
      {runs.length > 0 && (
        <section className="glass" style={{ padding: '22px 26px', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Results — {numRuns} run{numRuns > 1 ? 's' : ''} of the same prompt
            </div>
            {completedRuns.length >= 2 && (
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { label: `${left.label} consistency`,  score: leftScore,  color: left.color  },
                  { label: `${right.label} consistency`, score: rightScore, color: right.color },
                ].map(s => (
                  <div key={s.label} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '5px 12px',
                    background: `color-mix(in srgb, ${s.color} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${s.color} 28%, transparent)`,
                    borderRadius: 99, fontSize: 12,
                  }}>
                    <span style={{ color: s.color, fontWeight: 700 }}>{s.score}%</span>
                    <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {completedRuns.length >= 2 && (
            <Callout variant="info">
              <strong>Consistency score</strong> — near 100% means the model gives the same answer every run (expected with low temperature). A low score means each run produces something different (expected with high temperature).
            </Callout>
          )}

          <div style={{ marginTop: 14, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 48 }} />
                <col style={{ width: 'calc(50% - 24px)' }} />
                <col style={{ width: 'calc(50% - 24px)' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: left.color, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {left.label} — T={left.temperature.toFixed(2)} · P={left.topP.toFixed(2)} · K={left.topK === 0 ? 'off' : left.topK}
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: right.color, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {right.label} — T={right.temperature.toFixed(2)} · P={right.topP.toFixed(2)} · K={right.topK === 0 ? 'off' : right.topK}
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <ResultRow key={run.id} run={run} leftColor={left.color} rightColor={right.color} />
                ))}
              </tbody>
            </table>
          </div>

          {done && completedRuns.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Callout variant="tip">
                <strong>What to look for:</strong> Scan the {left.label} column — if all {completedRuns.length} outputs start similarly, that confirms low temperature is producing consistent answers. Scan the {right.label} column — each output should start differently, demonstrating that high temperature produces varied results from the same prompt.
              </Callout>
            </div>
          )}
        </section>
      )}
      </div> {/* end left column */}

      {/* ── Right: glossary ──────────────────────────────────────── */}
      <GlossaryPanelM2 />

    </div>
  );
}
