import { useState, useRef, useCallback } from 'react';
import {
  Brain, Shuffle, RefreshCw, GitMerge, Play, Square,
  Activity, Gauge, Info, BookOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import { streamGenerate } from '../api/client';
import TheoryCard from '../components/TheoryCard';
import Callout from '../components/Callout';
import StatPill from '../components/StatPill';

const PROMPTS = [
  'Explain what photosynthesis is in simple terms.',
  'Write the opening line of a mystery novel.',
  'What is the capital of Australia?',
  'Give one interesting fact about black holes.',
];

const SPEEDS = [
  { label: 'Turtle', ms: 800,  hint: 'one token every 800ms — read every probability bar clearly' },
  { label: 'Slow',   ms: 220,  hint: 'one token every 220ms — comfortable for teaching' },
  { label: 'Normal', ms: 70,   hint: 'one token every 70ms — natural reading pace' },
  { label: 'Fast',   ms: 20,   hint: 'one token every 20ms — near real time' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Glossary data
// ─────────────────────────────────────────────────────────────────────────────

const GLOSSARY = [
  {
    term: 'Token',
    color: 'var(--blue)',
    simple: 'A chunk of text the model works with — not always a full word.',
    technical: 'Atomic unit of LLM input/output. Text is split via BPE into integer token IDs from a fixed vocabulary (~100K entries).',
  },
  {
    term: 'Tokenisation',
    color: 'var(--blue)',
    simple: 'Splitting your text into those chunks before the model reads it.',
    technical: 'Pre-processing step using a trained tokeniser (BPE/SentencePiece) mapping raw text → sequence of integer token IDs.',
  },
  {
    term: 'Logits',
    color: 'var(--purple)',
    simple: 'Raw scores the model gives to every possible next token. Higher = more likely.',
    technical: 'Unnormalised output values from the final linear layer — one per vocabulary entry. Not yet bounded between 0 and 1.',
  },
  {
    term: 'Softmax',
    color: 'var(--purple)',
    simple: 'Converts raw scores into probabilities that all add up to 1.',
    technical: 'softmax(xᵢ) = eˣⁱ / Σ eˣʲ. Preserves ranking, guarantees a valid probability distribution. Temperature T divides logits before softmax.',
  },
  {
    term: 'Sampling',
    color: 'var(--teal)',
    simple: 'Picking one token from the probability list — not always the most likely one.',
    technical: 'Stochastic selection from the output distribution. Contrast with greedy decoding (argmax). Introduces randomness for varied outputs.',
  },
  {
    term: 'Greedy Decoding',
    color: 'var(--teal)',
    simple: 'Always picking the single most likely token. Predictable but can get repetitive.',
    technical: 'Argmax over distribution at each step. Equivalent to temperature → 0. Deterministic but prone to degenerate repetition loops.',
  },
  {
    term: 'Temperature',
    color: 'var(--amber)',
    simple: 'Dial for creativity. Low = safe & consistent. High = varied & creative.',
    technical: 'Scalar dividing logits before softmax. Low T sharpens the peak. High T flattens the distribution, giving lower-ranked tokens more mass.',
  },
  {
    term: 'Autoregressive',
    color: 'var(--amber)',
    simple: 'The model uses its own output as input for the next token — in a loop.',
    technical: 'P(xₜ | x₁…xₜ₋₁) — each token predicted conditioned on all previous ones. The model is its own input at every step.',
  },
  {
    term: 'Context Window',
    color: 'var(--rose)',
    simple: 'Max text the model can see at once. Prompt + history + output all count.',
    technical: 'Maximum sequence length in tokens for a single forward pass. Claude = 200K tokens (~150K words). Beyond this, content is truncated.',
  },
  {
    term: 'KV Cache',
    color: 'var(--rose)',
    simple: 'A memory trick that saves re-reading all previous tokens on every step.',
    technical: 'Key-Value attention pairs cached across decoding steps. Avoids recomputing previous token representations, reducing complexity per step.',
  },
  {
    term: 'Inference',
    color: 'var(--green)',
    simple: 'Running the model to get a response — what happens on every API call.',
    technical: 'Forward pass through the trained network — no gradient computation, no weight updates. Happens every time you call InvokeModel.',
  },
  {
    term: 'Stop Condition',
    color: 'var(--green)',
    simple: 'When the model stops — natural finish, token limit, or a word you set.',
    technical: 'Generation ends on EOS token, max_tokens reached, or stop_sequence matched. Returns stop_reason: end_turn / max_tokens / stop_sequence.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Glossary sidebar component
// ─────────────────────────────────────────────────────────────────────────────

function GlossaryPanel() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      position: 'sticky',
      top: 104, // below header + nav
      alignSelf: 'flex-start',
      maxHeight: 'calc(100vh - 120px)',
      overflowY: 'auto',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(255,255,255,0.1) transparent',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        padding: '10px 14px',
        background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 10,
      }}>
        <BookOpen size={14} color="var(--blue)" />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue)' }}>Key Terms</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{GLOSSARY.length} terms</span>
      </div>

      {/* Terms */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {GLOSSARY.map(g => {
          const isOpen = expanded === g.term;
          return (
            <div key={g.term}
              style={{
                background: isOpen
                  ? `color-mix(in srgb, ${g.color} 8%, rgba(255,255,255,0.03))`
                  : 'rgba(255,255,255,0.025)',
                border: `1px solid ${isOpen
                  ? `color-mix(in srgb, ${g.color} 30%, transparent)`
                  : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 9,
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Term header — always visible */}
              <button
                onClick={() => setExpanded(isOpen ? null : g.term)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 12px', background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left',
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: g.color,
                  boxShadow: isOpen ? `0 0 8px ${g.color}` : 'none',
                  transition: 'box-shadow 0.2s',
                }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: isOpen ? g.color : 'var(--text-primary)', flex: 1 }}>
                  {g.term}
                </span>
                {isOpen
                  ? <ChevronUp size={11} color="var(--text-muted)" />
                  : <ChevronDown size={11} color="var(--text-muted)" />}
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ padding: '0 12px 12px', animation: 'fadeUp 0.18s ease' }}>
                  {/* Simple */}
                  <div style={{
                    padding: '8px 10px', marginBottom: 6,
                    background: 'rgba(255,255,255,0.04)', borderRadius: 7,
                  }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                      Plain English
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {g.simple}
                    </div>
                  </div>
                  {/* Technical */}
                  <div style={{
                    padding: '8px 10px',
                    background: `color-mix(in srgb, ${g.color} 6%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${g.color} 18%, transparent)`,
                    borderRadius: 7,
                  }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: g.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                      Technical
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6, fontFamily: g.term.includes('Softmax') || g.term.includes('Autoregressive') ? 'var(--font-mono)' : 'var(--font)' }}>
                      {g.technical}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div style={{ marginTop: 12, padding: '8px 10px', fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6, textAlign: 'center' }}>
        Click any term to expand both explanations
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Theory visuals
// ─────────────────────────────────────────────────────────────────────────────

function ProbabilityBars() {
  const tokens = [
    { word: '"the"',  pct: 78 },
    { word: '"a"',    pct: 42 },
    { word: '"one"',  pct: 18 },
    { word: '"this"', pct:  9 },
    { word: '"any"',  pct:  3 },
  ];
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Probability of next token after "Plants need…"
      </div>
      {tokens.map((t, i) => (
        <div key={t.word} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ width: 44, fontSize: 11, fontFamily: 'var(--font-mono)', color: i === 0 ? 'var(--blue)' : 'var(--text-muted)', flexShrink: 0 }}>{t.word}</span>
          <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${t.pct}%`, background: i === 0 ? 'var(--blue)' : `rgba(139,92,246,${0.15 + (5 - i) * 0.07})`, borderRadius: 99 }} />
          </div>
          <span style={{ width: 30, fontSize: 11, fontFamily: 'var(--font-mono)', color: i === 0 ? 'var(--blue)' : 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{t.pct}%</span>
        </div>
      ))}
      <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(59,130,246,0.7)', display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block', flexShrink: 0 }} />
        The model picks one token from this list — not always the top one
      </div>
    </div>
  );
}

function StepFlow() {
  const steps = [
    { n: '1', label: 'Read all previous tokens',        color: 'var(--blue)'   },
    { n: '2', label: 'Score every possible next token', color: 'var(--purple)' },
    { n: '3', label: 'Sample one based on scores',      color: 'var(--teal)'   },
    { n: '4', label: 'Append it, then repeat',          color: 'var(--amber)'  },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '1 1 auto' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${s.color} 28%, transparent)`,
            borderRadius: 8, padding: '6px 8px', flex: 1, textAlign: 'center',
          }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: s.color, lineHeight: 1 }}>{s.n}</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: 14, flexShrink: 0 }}>→</span>}
        </div>
      ))}
    </div>
  );
}

function TemperaturePreview() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {[
        { label: 'Low temp (0.1)', bars: [90, 5, 3, 1, 1], color: 'var(--blue)',  desc: 'Peaked — #1 almost always wins' },
        { label: 'High temp (0.9)', bars: [32, 27, 20, 13, 8], color: 'var(--rose)', desc: 'Flat — any token has a chance' },
      ].map(side => (
        <div key={side.label}>
          <div style={{ fontSize: 10, color: side.color, fontWeight: 600, marginBottom: 6 }}>{side.label}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 44 }}>
            {side.bars.map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, background: `color-mix(in srgb, ${side.color} ${30 + h * 0.6}%, transparent)`, borderRadius: '3px 3px 0 0', minHeight: 3 }} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{side.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live probability simulation engine
// ─────────────────────────────────────────────────────────────────────────────

type TokenCategory = 'function' | 'common' | 'content' | 'rare' | 'punct';

// Common function words — very predictable, peaked distribution
const FUNCTION_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being',
  'it','in','to','of','and','or','but','for','on','at','by',
  'this','that','with','from','as','if','he','she','they',
  'we','you','i','not','no','so','do','did','has','have','had',
  'will','would','can','could','may','might','shall','should',
  'its','his','her','our','their','your','my','who','which','what',
]);

// Common content words — moderate probability
const COMMON_CONTENT = new Set([
  'also','more','such','other','used','using','make','use','way',
  'each','when','how','about','between','through','very','well','new',
  'good','first','two','one','time','these','then','than','just',
  'into','over','after','before','while','where','there','here',
  'most','many','much','some','only','even','both','all','any',
  'get','give','know','think','see','come','take','want','need',
]);

// Alternatives for specific common tokens
const TOKEN_ALTS: Record<string, string[]> = {
  // Determiners
  'the': ['a', 'an', 'this', 'that', 'each'],
  'a': ['the', 'an', 'this', 'one', 'any'],
  'an': ['a', 'the', 'this', 'each', 'one'],
  // Copulas
  'is': ['was', 'are', 'has', 'seems', 'remains'],
  'are': ['is', 'were', 'have', 'seem', 'become'],
  'was': ['is', 'were', 'had', 'seemed', 'became'],
  'has': ['had', 'have', 'is', 'was', 'contains'],
  // Modals
  'can': ['may', 'will', 'could', 'might', 'should'],
  'will': ['can', 'may', 'shall', 'would', 'could'],
  'can\'t': ['won\'t', 'doesn\'t', 'isn\'t', 'haven\'t', 'shouldn\'t'],
  // Common prepositions
  'in': ['on', 'at', 'within', 'into', 'through'],
  'of': ['in', 'for', 'from', 'with', 'about'],
  'to': ['into', 'toward', 'for', 'onto', 'through'],
  'for': ['to', 'of', 'in', 'with', 'as'],
  'with': ['through', 'using', 'via', 'by', 'alongside'],
  // Common content words
  'also': ['additionally', 'further', 'moreover', 'similarly', 'likewise'],
  'more': ['further', 'additional', 'greater', 'increased', 'extra'],
  'new': ['novel', 'recent', 'modern', 'fresh', 'innovative'],
  'first': ['initial', 'primary', 'main', 'key', 'leading'],
  'very': ['quite', 'extremely', 'highly', 'particularly', 'especially'],
  'used': ['employed', 'applied', 'utilized', 'deployed', 'leveraged'],
  'make': ['create', 'build', 'form', 'produce', 'generate'],
  'good': ['great', 'excellent', 'effective', 'strong', 'solid'],
  'important': ['crucial', 'significant', 'essential', 'critical', 'vital'],
  'different': ['various', 'diverse', 'distinct', 'unique', 'alternative'],
  'large': ['big', 'significant', 'substantial', 'major', 'considerable'],
  'small': ['minor', 'limited', 'tiny', 'minimal', 'brief'],
  'called': ['named', 'known', 'termed', 'described', 'labelled'],
  'known': ['called', 'termed', 'described', 'recognised', 'regarded'],
  'light': ['sunlight', 'energy', 'radiation', 'water', 'heat'],
  'sun': ['sunlight', 'solar', 'star', 'energy', 'radiation'],
  'cells': ['organisms', 'plants', 'molecules', 'structures', 'systems'],
  'process': ['mechanism', 'system', 'method', 'procedure', 'approach'],
  'energy': ['power', 'fuel', 'force', 'resources', 'capacity'],
  'water': ['moisture', 'liquid', 'fluid', 'hydrogen', 'oxygen'],
  'convert': ['transform', 'change', 'turn', 'translate', 'transfer'],
  'produce': ['create', 'generate', 'form', 'yield', 'make'],
  'oxygen': ['carbon', 'glucose', 'energy', 'gas', 'dioxide'],
  'glucose': ['sugar', 'energy', 'carbon', 'nutrients', 'compounds'],
};

// Category-specific alt banks (fallback)
const CATEGORY_ALTS: Record<TokenCategory, string[]> = {
  function:  ['the', 'a', 'this', 'that', 'which', 'an', 'each', 'some', 'any'],
  common:    ['also', 'further', 'often', 'then', 'well', 'thus', 'still', 'now'],
  content:   ['specific', 'particular', 'certain', 'various', 'key', 'main', 'primary'],
  rare:      ['novel', 'unique', 'distinct', 'complex', 'advanced', 'detailed'],
  punct:     ['.', ',', '!', ';', '—', ':', '?', '"'],
};

function categorize(token: string): TokenCategory {
  const t = token.toLowerCase().replace(/[^a-z']/g, '');
  if (!t) return 'punct';
  if (FUNCTION_WORDS.has(t)) return 'function';
  if (COMMON_CONTENT.has(t)) return 'common';
  if (t.length >= 8) return 'rare';
  return 'content';
}

function seededRand(seed: number): number {
  // Simple deterministic pseudo-random from a seed (so same token = same bar each time)
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function buildDistribution(chosen: number, n: number, seed: number): number[] {
  // Distribute remaining probability among n alternatives, unequally
  const remaining = 1 - chosen;
  const raw = Array.from({ length: n }, (_, i) => seededRand(seed + i * 7.3) * (n - i));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(v => (v / sum) * remaining);
}

interface TokenProb {
  token: string;
  category: TokenCategory;
  chosen: number;           // 0-1
  alternatives: { word: string; prob: number }[];
}

function simulateProb(token: string, prevTokens: string[]): TokenProb {
  const t    = token.trim();
  const cat  = categorize(t);
  const seed = t.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  // Chosen probability by category + small random jitter
  const BASE: Record<TokenCategory, [number, number]> = {
    function: [0.60, 0.82],
    common:   [0.30, 0.50],
    content:  [0.14, 0.38],
    rare:     [0.05, 0.20],
    punct:    [0.55, 0.85],
  };
  const [lo, hi] = BASE[cat];
  const chosenProb = lo + seededRand(seed) * (hi - lo);

  // Get alternatives
  const tl = t.toLowerCase();
  let altWords: string[] = TOKEN_ALTS[tl] ?? [];

  // Fill from category bank if needed
  if (altWords.length < 4) {
    const bank = CATEGORY_ALTS[cat].filter(w => w !== tl && !altWords.includes(w));
    altWords = [...altWords, ...bank].slice(0, 4);
  }
  altWords = altWords.slice(0, 4);

  const altProbs = buildDistribution(chosenProb, altWords.length, seed);

  return {
    token: t,
    category: cat,
    chosen: chosenProb,
    alternatives: altWords.map((w, i) => ({ word: w, prob: altProbs[i] })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Probability panel component
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<TokenCategory, { label: string; color: string; insight: string }> = {
  function: {
    label: 'Function word',
    color: 'var(--blue)',
    insight: 'Function words like articles and prepositions have very peaked distributions — context almost always dictates the right choice.',
  },
  common: {
    label: 'Common word',
    color: 'var(--teal)',
    insight: 'Common content words have moderate competition — a few candidates are plausible. Temperature starts to matter here.',
  },
  content: {
    label: 'Content word',
    color: 'var(--amber)',
    insight: 'Specific content words have real competition. This is where temperature and top P have the biggest impact on variety.',
  },
  rare: {
    label: 'Rare / specific',
    color: 'var(--purple)',
    insight: 'Unusual words have flat distributions — they only appear because temperature gave them a chance. Low temperature almost never reaches here.',
  },
  punct: {
    label: 'Punctuation',
    color: 'var(--text-muted)',
    insight: 'Punctuation is often predictable from syntax — but occasionally the model debates between a comma and a period.',
  },
};

function TempMiniBar({ prob, temp, color }: { prob: number; temp: number; color: string }) {
  // Show how this prob changes under different temperature
  const scaled = temp < 0.5
    ? Math.pow(prob, 1 / (temp + 0.1)) // steepen at low temp
    : prob * (1 - (temp - 0.5) * 0.4); // flatten at high temp
  const clamped = Math.max(0.01, Math.min(1, scaled));
  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${clamped * 100}%`, background: color, borderRadius: 99, transition: 'width 0.3s ease' }} />
    </div>
  );
}

function ProbabilityPanel({ prob, tokenIdx }: { prob: TokenProb; tokenIdx: number }) {
  const meta = CATEGORY_LABELS[prob.category];
  const all  = [
    { word: prob.token, p: prob.chosen, isChosen: true },
    ...prob.alternatives.map(a => ({ word: a.word, p: a.prob, isChosen: false })),
  ].sort((a, b) => b.p - a.p);
  const maxP = all[0].p;

  return (
    <div style={{
      padding: '14px 16px',
      background: 'rgba(0,0,0,0.35)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      animation: 'fadeUp 0.2s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Probability contest
          </span>
          <span style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 99, background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color, border: `1px solid color-mix(in srgb, ${meta.color} 28%, transparent)`, fontWeight: 600 }}>
            {meta.label}
          </span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          #{tokenIdx}
        </span>
      </div>

      {/* Token being placed */}
      <div style={{ marginBottom: 10, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Token chosen:</div>
        <span style={{
          fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-mono)',
          color: meta.color,
          background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${meta.color} 30%, transparent)`,
          borderRadius: 7, padding: '3px 12px',
        }}>
          {prob.token.trim() || '·'}
        </span>
        <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700, color: meta.color, fontFamily: 'var(--font-mono)' }}>
          {(prob.chosen * 100).toFixed(1)}%
        </span>
      </div>

      {/* Bar chart — all candidates */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        {all.map(({ word, p, isChosen }) => (
          <div key={word} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 70, fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'right', flexShrink: 0,
              color: isChosen ? meta.color : 'var(--text-muted)',
              fontWeight: isChosen ? 700 : 400,
            }}>
              {word}
              {isChosen && <span style={{ marginLeft: 4, fontSize: 9 }}>✓</span>}
            </div>
            <div style={{ flex: 1, height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(p / maxP) * 100}%`,
                background: isChosen
                  ? meta.color
                  : 'rgba(255,255,255,0.18)',
                borderRadius: 3,
                transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: isChosen ? `0 0 8px color-mix(in srgb, ${meta.color} 50%, transparent)` : 'none',
              }} />
            </div>
            <span style={{
              width: 38, fontSize: 10.5, textAlign: 'right', flexShrink: 0,
              fontFamily: 'var(--font-mono)',
              color: isChosen ? meta.color : 'var(--text-muted)',
            }}>
              {(p * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Temperature effect preview */}
      <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7, border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
          How temperature changes this distribution:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { t: 0.1, label: 'T=0.1 — peaked', color: 'var(--blue)' },
            { t: 0.9, label: 'T=0.9 — flat',   color: 'var(--rose)' },
          ].map(({ t, label, color }) => {
            const scaledChosen = t < 0.5
              ? Math.min(0.97, Math.pow(prob.chosen, 1 / Math.max(t, 0.05)) / (Math.pow(prob.chosen, 1 / Math.max(t, 0.05)) + (1 - prob.chosen)))
              : prob.chosen * (1 + (0.5 - t) * 0.6);
            const clamped = Math.max(0.03, Math.min(0.97, scaledChosen));
            return (
              <div key={t}>
                <div style={{ fontSize: 9.5, color, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 28 }}>
                  {[clamped, ...[0.6, 0.35, 0.2, 0.1].map(f => (1 - clamped) * f)].map((h, i) => (
                    <div key={i} style={{ flex: 1, background: i === 0 ? color : `color-mix(in srgb, ${color} ${20 + (5 - i) * 8}%, transparent)`, borderRadius: '2px 2px 0 0', height: `${Math.max(4, h * 100)}%`, minHeight: 3 }} />
                  ))}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                  {t < 0.5 ? `${(clamped * 100).toFixed(0)}% → winner dominates` : `${(clamped * 100).toFixed(0)}% → others compete`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insight */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
        {meta.insight}
      </div>

      {/* Honest disclaimer */}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
        <Info size={10} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.2)', lineHeight: 1.4 }}>
          Illustrative simulation — Claude via Bedrock does not expose real logprobs. Values are generated from token-category heuristics to demonstrate the concept.
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'fetching' | 'replaying' | 'done';

export default function Module1TokenGen() {
  const [prompt,    setPrompt]    = useState(PROMPTS[0]);
  const [speedIdx,  setSpeedIdx]  = useState(0);
  const [phase,     setPhase]     = useState<Phase>('idle');
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [fetched,   setFetched]   = useState(0);
  const [error,     setError]     = useState('');
  const [currentProb, setCurrentProb] = useState<TokenProb | null>(null);
  const [currentProbIdx, setCurrentProbIdx] = useState(0);
  const [showProb, setShowProb]   = useState(true);

  const allTokens = useRef<string[]>([]);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const replayFrom = useCallback((startIdx: number, ms: number) => {
    const step = (idx: number) => {
      if (idx >= allTokens.current.length) {
        setPhase('done');
        return;
      }
      const tok = allTokens.current[idx];
      setDisplayed(prev => [...prev, tok]);
      setCurrentProbIdx(idx + 1);
      // Compute simulated probability for this token
      setCurrentProb(simulateProb(tok, allTokens.current.slice(Math.max(0, idx - 5), idx)));
      timerRef.current = setTimeout(() => step(idx + 1), ms);
    };
    step(startIdx);
  }, []);

  const run = useCallback(() => {
    clearTimer();
    cancelRef.current?.();
    allTokens.current = [];
    setDisplayed([]);
    setFetched(0);
    setError('');
    setCurrentProb(null);
    setPhase('fetching');

    const ms = SPEEDS[speedIdx].ms;

    cancelRef.current = streamGenerate(
      { prompt, temperature: 0.7, maxTokens: 300 },
      {
        onToken: (chunk) => {
          allTokens.current.push(chunk);
          setFetched(n => n + 1);
        },
        onDone: () => {
          setPhase('replaying');
          replayFrom(0, ms);
        },
        onError: (msg) => {
          setPhase('idle');
          setError(msg);
        },
      }
    );
  }, [prompt, speedIdx, replayFrom]);

  const stop = useCallback(() => {
    clearTimer();
    cancelRef.current?.();
    setPhase('idle');
  }, []);

  const isRunning   = phase === 'fetching' || phase === 'replaying';
  const isFetching  = phase === 'fetching';
  const isReplaying = phase === 'replaying';

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

      {/* ── Left: main module content ───────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Theory ──────────────────────────────────────────────────────── */}
      <section className="glass" style={{ padding: '24px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Brain size={18} color="var(--blue)" />
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', lineHeight: 1.2 }}>How LLMs Generate Text</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>The most important thing to understand about any language model</p>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 18 }}>
          <TheoryCard icon={<Brain size={15} />} accent="var(--blue)"
            title="It generates, it does not retrieve"
            simple="Think of autocomplete on your phone — but instead of suggesting the next word for a text message, an LLM generates the next word of an entire response, one word-piece at a time, from scratch."
            technical="LLMs are autoregressive neural networks — P(xₜ | x₁…xₜ₋₁) — predicting each token conditioned on all previous tokens."
            visual={<ProbabilityBars />}
          />
          <TheoryCard icon={<Shuffle size={15} />} accent="var(--purple)"
            title="Each token is a probability contest"
            simple='At every step, the model scores every word in its vocabulary. High scores mean "more likely to come next." Then it picks one — but not always the most likely one. That pick is called sampling.'
            technical="The raw scores (logits) are passed through a softmax function to produce a valid probability distribution summing to 1. The probability panel in the demo below illustrates this live."
          />
        </div>

        <div className="grid-2" style={{ marginBottom: 18 }}>
          <TheoryCard icon={<GitMerge size={15} />} accent="var(--teal)"
            title="Sampling — deterministic vs random"
            simple="Greedy sampling always picks the #1 most likely token — same answer every time. Stochastic sampling picks randomly, weighted by probability — different answers every time. Temperature controls how flat or peaked the distribution is."
            visual={<TemperaturePreview />}
          />
          <TheoryCard icon={<RefreshCw size={15} />} accent="var(--amber)"
            title="One token at a time — in a loop"
            simple="The model doesn't plan the whole sentence first. It picks token 1, then uses token 1 to pick token 2, and so on until a stop condition. This is why outputs vary across runs."
            technical="This loop is called autoregressive generation. The model has no lookahead — it commits to each token before seeing what follows."
            visual={<StepFlow />}
          />
        </div>

        <Callout variant="info">
          <strong>Why this matters:</strong> Because generation is probabilistic, the same prompt produces different outputs every run. Settings like Temperature and Top P control the randomness — you will experiment with these directly in Module 2. The demo below shows this process token by token.
        </Callout>
      </section>

      {/* ── Live Demo ───────────────────────────────────────────────────── */}
      <section className="glass" style={{ padding: '24px 26px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={14} color="var(--rose)" />
            <span className="section-label">Live Token Stream — AWS Bedrock</span>
            {isRunning && <span style={{ width: 7, height: 7, borderRadius: '50%', background: isFetching ? 'var(--amber)' : 'var(--rose)', animation: 'pulse-ring 1s infinite' }} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Prob panel toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Probability panel</span>
              <button onClick={() => setShowProb(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: showProb ? 'var(--blue)' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: showProb ? 17 : 2 }} />
              </button>
            </div>
            {/* Speed */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Gauge size={12} color="var(--text-muted)" />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Speed:</span>
              {SPEEDS.map((s, i) => (
                <button key={s.label} onClick={() => setSpeedIdx(i)} disabled={isRunning}
                  style={{
                    padding: '4px 11px',
                    background: speedIdx === i ? 'var(--blue-dim)' : 'var(--bg-surface-2)',
                    border: `1px solid ${speedIdx === i ? 'rgba(59,130,246,0.5)' : 'var(--border)'}`,
                    borderRadius: 99, cursor: isRunning ? 'not-allowed' : 'pointer',
                    color: speedIdx === i ? 'var(--blue)' : 'var(--text-muted)',
                    fontSize: 11.5, fontWeight: speedIdx === i ? 700 : 400,
                    fontFamily: 'var(--font)', transition: 'all 0.15s',
                  }}
                >{s.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Speed hint */}
        <div style={{
          marginBottom: 14, padding: '7px 12px',
          background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span><strong style={{ color: 'var(--blue)' }}>{SPEEDS[speedIdx].label}:</strong> {SPEEDS[speedIdx].hint}</span>
          {isFetching  && <span style={{ fontSize: 11, color: 'var(--amber)' }}>Receiving {fetched} tokens from Bedrock…</span>}
          {isReplaying && <span style={{ fontSize: 11, color: 'var(--rose)' }}>Replaying {displayed.length}/{fetched} tokens…</span>}
        </div>

        {/* Prompt presets */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {PROMPTS.map(p => (
            <button key={p} onClick={() => setPrompt(p)} disabled={isRunning} className="btn btn-ghost"
              style={{ fontSize: 12, borderColor: prompt === p ? 'rgba(59,130,246,0.45)' : undefined, color: prompt === p ? 'var(--blue)' : undefined }}>
              {p.slice(0, 36)}{p.length > 36 ? '…' : ''}
            </button>
          ))}
        </div>

        <textarea className="glass-input" rows={2} value={prompt} disabled={isRunning}
          onChange={e => setPrompt(e.target.value)} placeholder="Enter any prompt…" style={{ marginBottom: 14 }} />

        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <button className="btn btn-primary" onClick={run} disabled={isRunning || !prompt.trim()}>
            <Play size={13} />
            {isFetching   ? 'Fetching from Bedrock…'
              : isReplaying ? `Playing back (${SPEEDS[speedIdx].label})…`
              : 'Stream tokens live'}
          </button>
          {isRunning && (
            <button className="btn btn-ghost" onClick={stop}>
              <Square size={13} /> Stop
            </button>
          )}
        </div>

        {/* Two-column output area — text left, probability right */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: showProb && (isReplaying || (phase === 'done' && currentProb)) ? '1fr 300px' : '1fr',
          gap: 14,
          alignItems: 'start',
          transition: 'grid-template-columns 0.3s ease',
        }}>
          {/* Left: streaming output */}
          <div>
            <div className="output-panel" style={{ background: 'rgba(0,0,0,0.42)', border: '1px solid rgba(255,255,255,0.07)', minHeight: 140, lineHeight: 1.9, fontSize: 14.5 }}>
              {displayed.map((t, i) => {
                const isLatest = i === displayed.length - 1;
                return (
                  <span key={i} style={{
                    display: 'inline',
                    background: isLatest && isReplaying ? 'rgba(59,130,246,0.35)' : 'transparent',
                    borderRadius: 3,
                    transition: 'background 0.4s ease',
                    animation: isLatest ? 'tokenHighlight 0.5s ease both' : 'none',
                  }}>
                    {t}
                  </span>
                );
              })}
              {isReplaying && (
                <span style={{
                  display: 'inline-block', width: 10, height: 17,
                  background: 'var(--blue)', marginLeft: 1,
                  animation: 'blink 0.65s step-end infinite',
                  verticalAlign: 'middle', borderRadius: 2,
                }} />
              )}
              {isFetching && displayed.length === 0 && (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Buffering {fetched} tokens from Bedrock…
                </span>
              )}
              {displayed.length === 0 && !isRunning && !error && (
                <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                  Press "Stream tokens live" — tokens replay at your chosen speed, one at a time…
                </span>
              )}
            </div>

            {/* Stats */}
            {displayed.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <StatPill label="Tokens shown"   value={displayed.length} color="var(--blue)"   />
                <StatPill label="Total received" value={fetched}           color="var(--purple)" />
                <StatPill label="Status"         value={phase}             color="var(--amber)" mono={false} />
              </div>
            )}
          </div>

          {/* Right: probability panel */}
          {showProb && currentProb && (isReplaying || phase === 'done') && (
            <div>
              <ProbabilityPanel prob={currentProb} tokenIdx={currentProbIdx} />
            </div>
          )}
        </div>

        <style>{`
          @keyframes tokenHighlight {
            0%   { background: rgba(59,130,246,0.45); border-radius: 3px; }
            80%  { background: rgba(59,130,246,0.08); }
            100% { background: transparent; }
          }
        `}</style>

        {error && <div style={{ marginTop: 10 }}><Callout variant="danger">{error}</Callout></div>}

        <div style={{ marginTop: 16 }}>
          <Callout variant="tip">
            <strong>Use Slow mode</strong> and watch the probability panel on the right update with each token. Notice how function words like "the" show very peaked distributions (one winner dominates), while specific content words show flatter distributions with real competition. That competition is exactly what temperature controls.
          </Callout>
        </div>
      </section>
      </div> {/* end left column */}

      {/* ── Right: glossary sidebar ─────────────────────────────────── */}
      <GlossaryPanel />

    </div>
  );
}
