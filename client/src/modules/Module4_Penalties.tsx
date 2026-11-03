/**
 * Module 4 — Repetition & Vocabulary Control
 *
 * NOTE: frequency_penalty / presence_penalty are OpenAI parameters.
 * No active model on AWS Bedrock supports them natively as of 2025:
 *  - cohere.command-text-v14 → EOL
 *  - cohere.command-r-v1:0  → chat API, no penalty params
 *  - Claude (Anthropic)      → silently ignored
 *
 * Real-world solution on Claude: system prompt instruction + higher temperature.
 * This module teaches the CONCEPT and demonstrates the REAL CLAUDE approach.
 *
 * Demo: Marketing copy generator — a real production use case where
 * repetition visibly kills quality. Same prompt, before vs after.
 */
import { useState, useCallback } from 'react';
import {
  Repeat2, BarChart2, Minus, Play,
  Info, AlertTriangle, Thermometer, CheckCircle, XCircle,
  BookOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import { generate } from '../api/client';
import type { GenerateResult } from '../types';
import TheoryCard from '../components/TheoryCard';
import Callout from '../components/Callout';

// ─────────────────────────────────────────────────────────────────────────────
// Glossary
// ─────────────────────────────────────────────────────────────────────────────

const GLOSSARY_M4 = [
  {
    term: 'Frequency Penalty',
    color: 'var(--amber)',
    simple: 'A progressive tax on repeated words. The more times a word appears, the stronger the penalty gets.',
    technical: 'logit[t] −= frequency_penalty × count(t in output). Penalty scales with occurrence count. Range 0–2 (OpenAI). Not available on Claude via Bedrock.',
  },
  {
    term: 'Presence Penalty',
    color: 'var(--pink)',
    simple: 'A flat one-time fee for any word that has appeared — same penalty whether it appeared once or twenty times.',
    technical: 'logit[t] −= presence_penalty × (1 if t seen else 0). Unlike frequency penalty, does not scale. Better for topic diversity. Not available on Claude via Bedrock.',
  },
  {
    term: 'OpenAI vs Claude',
    color: 'var(--rose)',
    simple: 'These two penalty parameters are OpenAI-specific. Sending them to Claude via Bedrock does nothing — silently ignored.',
    technical: 'Claude\'s Bedrock API does not accept frequency_penalty or presence_penalty. Cohere command-text-v14 supported them but is now EOL. No active Bedrock model supports them as of 2025.',
  },
  {
    term: 'System Prompt (anti-repetition)',
    color: 'var(--teal)',
    simple: 'On Claude, explicitly instructing the model to avoid reusing words is the most effective repetition control available.',
    technical: 'Claude\'s instruction-following acts as a strong prior biasing token selection. A strict "never repeat a word over 4 letters" instruction consistently reduces vocabulary repetition.',
  },
  {
    term: 'Temperature (for variety)',
    color: 'var(--blue)',
    simple: 'Higher temperature flattens the distribution — less common words become more likely, naturally producing varied vocabulary.',
    technical: 'Increased entropy from higher T redistributes probability mass away from dominant high-frequency tokens. Works synergistically with anti-repetition system prompts.',
  },
  {
    term: 'Logit Adjustment',
    color: 'var(--amber)',
    simple: 'Both penalties work by reducing a token\'s raw score before sampling. Lower score = less likely to be picked.',
    technical: 'Applied directly to logits before softmax. Reduces token probability without zeroing it. The model can still use the word but must overcome the penalty cost each time.',
  },
  {
    term: 'Repetition Loop',
    color: 'var(--rose)',
    simple: 'When the model gets stuck repeating the same words or phrases — especially common in longer outputs.',
    technical: 'Pathological autoregressive behaviour: model\'s own output reinforces high-probability repeated tokens in subsequent steps. Worsens at lower temperatures.',
  },
  {
    term: 'Word Frequency Analysis',
    color: 'var(--purple)',
    simple: 'Counting how many times each word appears. Words used 3+ times are highlighted red — those are your repetition problems.',
    technical: 'Post-generation heuristic: normalise text, count tokens (length > 4), sort by frequency. Words with count ≥ 3 indicate penalty-worthy repetition in typical copy lengths.',
  },
];

function GlossaryPanelM4() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div style={{ width: 260, flexShrink: 0, position: 'sticky', top: 104, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10 }}>
        <BookOpen size={14} color="var(--amber)" />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--amber)' }}>Key Terms</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{GLOSSARY_M4.length} terms</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {GLOSSARY_M4.map(g => {
          const isOpen = expanded === g.term;
          return (
            <div key={g.term} style={{ background: isOpen ? `color-mix(in srgb, ${g.color} 8%, rgba(255,255,255,0.03))` : 'rgba(255,255,255,0.025)', border: `1px solid ${isOpen ? `color-mix(in srgb, ${g.color} 30%, transparent)` : 'rgba(255,255,255,0.07)'}`, borderRadius: 9, overflow: 'hidden', transition: 'all 0.2s ease' }}>
              <button onClick={() => setExpanded(isOpen ? null : g.term)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: g.color, boxShadow: isOpen ? `0 0 8px ${g.color}` : 'none' }} />
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
      <div style={{ marginTop: 12, padding: '8px 10px', fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center' }}>Click any term to expand</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Theory visuals
// ─────────────────────────────────────────────────────────────────────────────

function PenaltyFormulas() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[
        { label: 'Frequency Penalty', color: 'var(--amber)', formula: 'logit[token]  −=  α  ×  count(token in output)', note: 'Progressive — 10th use costs more than 2nd' },
        { label: 'Presence Penalty',  color: 'var(--pink)',  formula: 'logit[token]  −=  β  ×  (1  if  token seen  else  0)', note: 'Flat — 2nd and 20th use cost exactly the same' },
      ].map(p => (
        <div key={p.label} style={{ background: `color-mix(in srgb, ${p.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${p.color} 22%, transparent)`, borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: p.color, marginBottom: 5 }}>{p.label}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{p.formula}</div>
          <div style={{ fontSize: 11, color: p.color, fontStyle: 'italic' }}>{p.note}</div>
        </div>
      ))}
    </div>
  );
}

function LogitEffect() {
  const rows = [
    { word: '"AI"',       base: 82, after: 22, rep: true  },
    { word: '"platform"', base: 58, after: 18, rep: true  },
    { word: '"system"',   base: 45, after: 45, rep: false },
    { word: '"network"',  base: 32, after: 32, rep: false },
  ];
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Logit scores: grey = original · teal = after penalty</div>
      {rows.map(r => (
        <div key={r.word} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <span style={{ width: 74, fontSize: 11, fontFamily: 'var(--font-mono)', flexShrink: 0, color: r.rep ? 'var(--rose)' : 'var(--text-muted)' }}>{r.word}</span>
          <div style={{ flex: 1, position: 'relative', height: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 3 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${r.base}%`, background: 'rgba(255,255,255,0.12)', borderRadius: 3 }} />
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${r.after}%`, background: r.rep ? 'var(--teal)' : 'rgba(255,255,255,0.12)', borderRadius: 3 }} />
          </div>
          {r.rep
            ? <span style={{ fontSize: 10, color: 'var(--rose)', flexShrink: 0, fontFamily: 'var(--font-mono)', width: 52 }}>{r.base}→{r.after}</span>
            : <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, width: 52 }}>unchanged</span>}
        </div>
      ))}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Only repeated tokens pay the penalty. Fresh words are unaffected.</div>
    </div>
  );
}

function ProviderTable() {
  const rows = [
    { name: 'Anthropic Claude',   color: 'var(--purple)', bedrock: true,  freq: false, pres: false, temp: true,  sysPrompt: true,  note: 'Use system prompt + temperature. Native penalty params silently ignored.' },
    { name: 'Cohere command-text-v14', color: 'var(--teal)', bedrock: false, freq: true, pres: true, temp: true,  sysPrompt: false, note: 'Supported these natively — but EOL on Bedrock as of 2025.' },
    { name: 'Cohere Command R/R+', color: 'var(--teal)',   bedrock: true,  freq: false, pres: false, temp: true,  sysPrompt: false, note: 'Active on Bedrock but chat API — no penalty params exposed.' },
    { name: 'OpenAI GPT-4o',      color: 'var(--green)',  bedrock: false, freq: true,  pres: true,  temp: true,  sysPrompt: true,  note: 'Original source of these params. Azure OpenAI or OpenAI API only.' },
    { name: 'Meta Llama 3',       color: 'var(--amber)',  bedrock: true,  freq: false, pres: false, temp: true,  sysPrompt: true,  note: 'No penalty params. Control via temperature and prompt.' },
  ];
  const hdr: React.CSSProperties = { padding: '7px 9px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(255,255,255,0.07)' };
  const cell = (i: number): React.CSSProperties => ({ padding: '8px 9px', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' as const });
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['Model', 'On Bedrock', 'freq_penalty', 'pres_penalty', 'temperature', 'system_prompt', 'Note'].map(h => (
              <th key={h} style={{ ...hdr, textAlign: h === 'Model' || h === 'Note' ? 'left' : 'center', minWidth: h === 'Note' ? 180 : h === 'Model' ? 150 : 80 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name}>
              <td style={{ ...cell(i), textAlign: 'left' }}><span style={{ fontWeight: 700, color: r.color }}>{r.name}</span></td>
              <td style={cell(i)}>{r.bedrock ? <CheckCircle size={13} color="var(--green)" /> : <XCircle size={13} color="var(--rose)" />}</td>
              <td style={cell(i)}>{r.freq  ? <CheckCircle size={13} color="var(--teal)" />  : <XCircle size={13} color="rgba(255,255,255,0.18)" />}</td>
              <td style={cell(i)}>{r.pres  ? <CheckCircle size={13} color="var(--teal)" />  : <XCircle size={13} color="rgba(255,255,255,0.18)" />}</td>
              <td style={cell(i)}>{r.temp  ? <CheckCircle size={13} color="var(--teal)" />  : <XCircle size={13} color="rgba(255,255,255,0.18)" />}</td>
              <td style={cell(i)}>{r.sysPrompt ? <CheckCircle size={13} color="var(--teal)" /> : <XCircle size={13} color="rgba(255,255,255,0.18)" />}</td>
              <td style={{ ...cell(i), textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Output helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildFreqMap(text: string): Record<string, number> {
  const map: Record<string, number> = {};
  text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
    .filter(w => w.length > 4)
    .forEach(w => { map[w] = (map[w] || 0) + 1; });
  return map;
}

function HighlightedOutput({ text }: { text: string }) {
  const freq = buildFreqMap(text);
  const seen: Record<string, number> = {};
  return (
    <>
      {text.split(/(\s+)/).map((w, i) => {
        const key  = w.toLowerCase().replace(/[^a-z]/g, '');
        const isRep = key.length > 4 && (freq[key] ?? 0) >= 2;  // threshold: 2+
        seen[key]  = (seen[key] ?? 0) + 1;
        const depth = seen[key] ?? 1;
        const op = isRep ? Math.min(0.15 + depth * 0.18, 0.9) : 0;
        return (
          <span key={i} style={{ background: isRep ? `rgba(244,63,94,${op * 0.45})` : 'transparent', color: isRep ? `rgba(255,130,130,${0.65 + op * 0.3})` : 'inherit', borderRadius: 3 }}>{w}</span>
        );
      })}
    </>
  );
}

function WordFreqMini({ text, color }: { text: string; color: string }) {
  const freq   = buildFreqMap(text);
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max    = Math.max(...sorted.map(([, c]) => c), 1);
  return (
    <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Most repeated words:</div>
      {sorted.length === 0 ? (
        <div style={{ fontSize: 11.5, color: 'var(--teal)', fontStyle: 'italic' }}>No words repeated 5+ letters — excellent vocabulary variety</div>
      ) : (
        sorted.map(([w, c]) => (
          <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <span style={{ width: 80, fontSize: 10.5, fontFamily: 'var(--font-mono)', flexShrink: 0, color: c >= 2 ? 'var(--rose)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w}</span>
            <div style={{ flex: 1, height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(c / max) * 100}%`, background: c >= 2 ? 'var(--rose)' : color, borderRadius: 99 }} />
            </div>
            <span style={{ width: 22, fontSize: 10.5, fontFamily: 'var(--font-mono)', color: c >= 2 ? 'var(--rose)' : 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{c}×</span>
          </div>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Production use case prompts — designed to reliably trigger repetition
// ─────────────────────────────────────────────────────────────────────────────

const PROMPTS = [
  {
    label: 'Machine Learning',
    text: 'Write about the importance of machine learning in modern technology. Keep elaborating with more detail.',
    why: 'Broad topic with instruction to "keep elaborating" — the left side will loop on "machine learning", "important", "technology" visibly.',
  },
  {
    label: 'AI Benefits',
    text: 'Explain all the ways artificial intelligence is beneficial for businesses. Be thorough and detailed.',
    why: 'Open-ended list on a broad topic — "artificial", "intelligence", "business", "benefits" will stack up rapidly on the left.',
  },
  {
    label: 'Digital Transformation',
    text: 'Write about why companies need digital transformation. Be persuasive and give many reasons.',
    why: '"Digital", "transformation", "companies", "business" will repeat heavily — the contrast with the right side is very clear.',
  },
];

// System prompt that FORCES repetition — left side baseline
const FORCE_REP_SYSTEM = `You are a writer who heavily repeats key words and phrases throughout your response.
Use the main topic words repeatedly in every sentence.`;

// System prompt that ELIMINATES repetition — right side
const ANTI_REP_SYSTEM = `You are a precise, professional copywriter.

STRICT RULE: Never use the same word (5+ letters) more than once in your entire response.
Before using any word, check if you have already used it. If yes, choose a different synonym.
This applies to every word — marketing, technical, descriptive.

Write varied, rich vocabulary throughout.`;

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function Module4Penalties() {
  const [promptIdx,     setPromptIdx]     = useState(0);
  const [prompt,        setPrompt]        = useState(PROMPTS[0].text);
  const [showWhy,       setShowWhy]       = useState(true);
  const [useAntiRep,    setUseAntiRep]    = useState(true);
  const [leftResult,    setLeft]          = useState<GenerateResult | null>(null);
  const [rightResult,   setRight]         = useState<GenerateResult | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  const run = useCallback(async () => {
    setLoading(true); setLeft(null); setRight(null); setError('');
    try {
      const [r1, r2] = await Promise.all([
        // Left: forced repetition — same temperature as right so temp isn't the variable
        generate({ prompt, systemPrompt: FORCE_REP_SYSTEM, temperature: 0.7, maxTokens: 220, mode: 'single' }),
        // Right: strict anti-repetition system prompt — same temperature
        generate({ prompt, systemPrompt: useAntiRep ? ANTI_REP_SYSTEM : undefined, temperature: 0.7, maxTokens: 220, mode: 'single' }),
      ]);
      if (r1.mode === 'single') setLeft(r1.result);
      if (r2.mode === 'single') setRight(r2.result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [prompt, useAntiRep]);

  const leftRepCount  = leftResult  ? Object.values(buildFreqMap(leftResult.text)).filter(c => c >= 2).length  : 0;
  const rightRepCount = rightResult ? Object.values(buildFreqMap(rightResult.text)).filter(c => c >= 2).length : 0;

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ══ Theory ════════════════════════════════════════════════ */}
        <section className="glass" style={{ padding: '26px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Repeat2 size={20} color="var(--amber)" />
            <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>Repetition &amp; Vocabulary Control</h2>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20, maxWidth: 720 }}>
            LLMs repeat words because high-frequency tokens stay dominant in the probability distribution. Two mathematical penalties reduce this — but they are an <strong style={{ color: 'var(--text-primary)' }}>OpenAI concept</strong>. Understanding them matters because you will see them in documentation, tutorials, and other APIs. On Claude via Bedrock, the practical solution is different.
          </p>

          <div className="grid-2" style={{ marginBottom: 20 }}>
            <TheoryCard icon={<BarChart2 size={15} />} accent="var(--amber)"
              title="Frequency Penalty — progressive tax"
              simple="Every time the model uses a word, that word's probability score gets reduced proportionally to how many times it has appeared. Use it 5 times and the penalty is 5× stronger than after 1 use. Like a toll that keeps doubling."
              technical="logit[t] −= freq_penalty × count(t). Scales with repetition count. Effective range 0–2. Values above 1.5 can suppress legitimate technical terms that must repeat."
              visual={<PenaltyFormulas />}
            />
            <TheoryCard icon={<Minus size={15} />} accent="var(--pink)"
              title="Presence Penalty — flat discouragement"
              simple="Once a word appears anywhere in the output, it gets a fixed penalty from that point on — whether it showed up once or twenty times. A one-time fee, not a compounding tax. Better for forcing topic diversity."
              technical="logit[t] −= pres_penalty × (1 if t seen else 0). Flat penalty regardless of count. The 2nd and 20th use cost exactly the same. Discourages revisiting any topic equally."
              visual={<LogitEffect />}
            />
          </div>

          {/* Honest callout */}
          <div style={{ padding: '14px 16px', background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.22)', borderRadius: 10, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <AlertTriangle size={14} color="var(--rose)" />
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--rose)' }}>These parameters do not work on Claude via Bedrock</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>frequency_penalty</code> and <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>presence_penalty</code> are OpenAI GPT parameters. Sending them to Claude via Bedrock is silently ignored. The Cohere model that supported them (<code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>command-text-v14</code>) reached end of life in 2025. No currently active Bedrock model supports them natively. The table below shows the full picture.
            </p>
          </div>

          <ProviderTable />
        </section>

        {/* ══ Production Demo ════════════════════════════════════════ */}
        <section className="glass" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Repeat2 size={17} color="var(--amber)" />
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Live Demo — Marketing Copy Generator</h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 18 }}>
            Same prompt. Same temperature (T=0.7). Only the system prompt changes. Left: instructed to repeat words — the problem. Right: instructed never to repeat — the solution. Red highlights = words used 3+ times.
          </p>

          {/* Prompt presets */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Choose a prompt that reliably triggers repetition:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PROMPTS.map((p, i) => (
                <button key={p.label} onClick={() => { setPromptIdx(i); setPrompt(p.text); setShowWhy(true); }} className="btn btn-ghost"
                  style={{ fontSize: 12, borderColor: promptIdx === i ? 'rgba(245,158,11,0.45)' : undefined, color: promptIdx === i ? 'var(--amber)' : undefined, background: promptIdx === i ? 'rgba(245,158,11,0.07)' : undefined }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {showWhy && (
            <div style={{ marginBottom: 10, padding: '8px 12px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, color: 'rgba(245,158,11,0.9)', display: 'flex', gap: 8 }}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span><strong>Why this triggers repetition:</strong> {PROMPTS[promptIdx].why}</span>
            </div>
          )}

          <textarea className="glass-input" rows={2} value={prompt}
            onChange={e => { setPrompt(e.target.value); setShowWhy(false); }}
            style={{ marginBottom: 14 }} />

          {/* Right-side toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '10px 14px', background: useAntiRep ? 'rgba(20,184,166,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${useAntiRep ? 'rgba(20,184,166,0.22)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 9 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: useAntiRep ? 'var(--teal)' : 'var(--text-muted)' }}>
                Right side system prompt: {useAntiRep ? '"Never repeat a word" — ON' : 'OFF (bare prompt, same T=0.7)'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Toggle this to show the system prompt is what drives the difference — not temperature
              </div>
            </div>
            <button onClick={() => setUseAntiRep(v => !v)} style={{ width: 38, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: useAntiRep ? 'var(--teal)' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: useAntiRep ? 19 : 2 }} />
            </button>
          </div>

          <button className="btn btn-primary" onClick={run} disabled={loading} style={{ marginBottom: 20, padding: '10px 28px' }}>
            <Play size={13} /> {loading ? 'Generating…' : 'Run — compare repetition'}
          </button>

          {error && <Callout variant="danger">{error}</Callout>}

          {/* Side-by-side results */}
          <div className="grid-2">
            {[
              { label: 'Without controls', sublabel: '', result: leftResult,  color: 'var(--rose)', repCount: leftRepCount  },
              { label: useAntiRep ? 'With anti-repetition' : 'Same prompt, no instruction', sublabel: useAntiRep ? 'System prompt: "never reuse a word"' : 'No system prompt — T=0.7', result: rightResult, color: 'var(--teal)', repCount: rightRepCount },
            ].map(col => (
              <div key={col.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, boxShadow: `0 0 6px ${col.color}` }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: col.color }}>{col.label}</div>
                    {col.sublabel && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{col.sublabel}</div>}
                  </div>
                  {col.result && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: col.repCount > 2 ? 'rgba(244,63,94,0.12)' : 'rgba(20,184,166,0.10)', border: `1px solid ${col.repCount > 2 ? 'rgba(244,63,94,0.28)' : 'rgba(20,184,166,0.22)'}`, color: col.repCount > 2 ? 'var(--rose)' : 'var(--teal)' }}>
                      {col.repCount} repeated
                    </span>                  )}
                </div>
                <div className="output-panel" style={{ minHeight: 110, fontSize: 13.5, lineHeight: 1.75 }}>
                  {loading
                    ? <><div className="skeleton" style={{ height: 11, width: '90%', marginBottom: 7, borderRadius: 3 }} /><div className="skeleton" style={{ height: 11, width: '75%', marginBottom: 7, borderRadius: 3 }} /><div className="skeleton" style={{ height: 11, width: '82%', borderRadius: 3 }} /></>
                    : col.result
                      ? <HighlightedOutput text={col.result.text} />
                      : <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>Output will appear here…</span>}
                </div>
                {col.result && <WordFreqMini text={col.result.text} color={col.color} />}
              </div>
            ))}
          </div>

          {leftResult && rightResult && (
            <div style={{ marginTop: 16 }}>
              <Callout variant="tip">
                <strong>What to look for:</strong> Red highlights = same word used 3+ times. The word frequency charts below each output tell the full story — left column should have several red entries, right column should have fewer or none. Try toggling the system prompt OFF to see how much work temperature alone does vs the combined approach.
              </Callout>
            </div>
          )}
        </section>

      </div>
      <GlossaryPanelM4 />
    </div>
  );
}
