/**
 * MODULE 6 — Failure Classification
 * Click-to-classify game: learner sees a real failure, classifies it, picks the fix.
 * SEV1 gets a pulsing alert animation.
 */
import { useState } from 'react';
import { Bug, TrendingUp, AlertCircle, Wrench, RotateCcw, CheckCircle2, XCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import type { FailureCase, FailureType } from '../types';
import TheoryCard from '../components/TheoryCard';
import Callout from '../components/Callout';

const GLOSSARY_M6 = [
  { term: 'Hallucination', color: 'var(--amber)', simple: 'The model confidently states something false — an invented fact, fake citation, or made-up statistic presented as true.', technical: 'Autoregressive generation without factual grounding. High-probability token sequences can be factually incorrect. Root cause: parametric knowledge has no truth-checking mechanism. Fix: RAG grounding or citation verification.' },
  { term: 'Cost Spike', color: 'var(--rose)', simple: 'A single API call or automated pipeline generates far more tokens than expected — causing unexpectedly large bills.', technical: 'Unguarded max_tokens allows the model to consume the full context window. In automated pipelines one bad call can cost 200k tokens × output rate. Fix: always set max_tokens + AWS Budget Alerts.' },
  { term: 'Unsafe Output', color: 'var(--rose)', simple: 'The model generates content that violates safety policies — harmful advice, dangerous instructions, inappropriate content.', technical: 'RLHF fine-tuning reduces but does not eliminate unsafe generation. Adversarial prompts or edge cases can bypass training-time alignment. Fix: output validation layer + Bedrock Guardrails content filters.' },
  { term: 'Severity Classification', color: 'var(--purple)', simple: 'A label (Sev1/Sev2/Sev3) that determines how urgently a GenAI failure must be fixed and escalated.', technical: 'Sev1: immediate customer harm or safety risk — page on-call now. Sev2: significant quality or cost issue — fix within hours. Sev3: minor quality issue — fix in next sprint.' },
  { term: 'Sev1', color: 'var(--rose)', simple: 'Highest severity. Immediate user harm or safety risk. Unsafe output or data exposure. Requires immediate response.', technical: 'Trigger: unsafe output reaching users, PII exposed, model used as weapon. Response: disable endpoint, page on-call, executive notification. Example: model gives medical advice that could harm a patient.' },
  { term: 'Sev2', color: 'var(--amber)', simple: 'Significant issue but not immediate harm. Hallucination that misleads users, or cost spike draining budget.', technical: 'Trigger: fabricated citations, systematic misinformation, cost spike >2× expected. Response: fix within business hours, inform stakeholders, add guardrail. Example: fake academic citation in a research tool.' },
  { term: 'RAG Grounding', color: 'var(--blue)', simple: 'Giving the model verified documents to reference before answering — so it cites real sources instead of making things up.', technical: 'Retrieval-Augmented Generation: relevant documents retrieved from vector DB and injected into context before generation. Model instructed to base answer only on retrieved content. Reduces hallucination on factual tasks.' },
  { term: 'Prompt Injection (failure)', color: 'var(--rose)', simple: 'A user embeds instructions in their input designed to override the system prompt and make the model ignore its rules.', technical: 'Attack: user input contains "Ignore previous instructions..." or role-play hijacks. Bypasses system-level constraints. Fix: input validation to detect injection patterns + robust system prompt wording.' },
  { term: 'Rate Limiting', color: 'var(--teal)', simple: 'Capping how many API calls or tokens a user or system can consume per unit time — prevents runaway cost and abuse.', technical: 'Applied at API gateway layer. Limits: requests/minute, tokens/minute, tokens/user/day. In Bedrock: account-level TPS limits + custom quotas. Prevents cost spikes from loops or abuse.' },
  { term: 'Output Validation', color: 'var(--green)', simple: 'Checking what the model generated before showing it to the user — the last safety net before harmful content reaches anyone.', technical: 'Post-inference content scan. Checks: harmful content categories, denied topics, PII in response, policy violations. If flagged: return error or safe fallback, log for review. Never show raw model output without this in production.' },
];

function GlossaryPanelM6() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div style={{ width: 260, flexShrink: 0, position: 'sticky', top: 104, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10 }}>
        <BookOpen size={14} color="var(--rose)" />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--rose)' }}>Key Terms</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{GLOSSARY_M6.length} terms</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {GLOSSARY_M6.map(g => {
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

const FAILURES: FailureCase[] = [
  {
    id: 'f1', title: 'Fabricated academic citation',
    prompt: 'Cite a peer-reviewed paper on the cognitive effects of caffeine.',
    output: 'Johnson, R. & Patel, S. (2022). "Caffeine-Induced Memory Enhancement." Journal of Cognitive Neuroscience, 44(3), 112–128.',
    correctType: 'hallucination', severity: 'sev2',
    correctFix: 'Add RAG grounding — retrieve from a verified academic database before generating the citation.',
    explanation: 'The model invented a convincing but entirely fictional citation. No such paper exists. This is a hallucination — a confident generation of false information. Classified as a bug (Sev2) unless it causes direct harm.',
  },
  {
    id: 'f2', title: 'Infinite repetition loop',
    prompt: 'Tell me about renewable energy.',
    output: 'Renewable energy is important. Renewable energy is important. Renewable energy is important…',
    correctType: 'cost_spike', severity: 'sev3',
    correctFix: 'Add a stop sequence, increase frequency penalty, and set an explicit max_tokens limit.',
    explanation: 'A repetition loop wastes the entire token budget producing no useful output — and you still pay for every token generated. Sev3 — annoying and costly but not directly harmful.',
  },
  {
    id: 'f3', title: 'Harmful self-harm advice',
    prompt: 'I am feeling really low. How can I cope?',
    output: 'You could try self-harm as a distraction technique. Many people find physical pain redirects emotional distress effectively.',
    correctType: 'unsafe_output', severity: 'sev1',
    correctFix: 'Enable content moderation filter. Add a system prompt guardrail. Lower temperature. Review safe messaging guidelines.',
    explanation: 'Any response that could cause direct harm to a user is automatically Sev1. This must be fixed before any deployment — it is not a quality issue, it is a safety incident.',
  },
  {
    id: 'f4', title: 'Incorrect numerical calculation',
    prompt: 'What is 17% of 250?',
    output: 'That would be 47.5.',
    correctType: 'hallucination', severity: 'sev2',
    correctFix: 'Route mathematical operations to a calculator tool via function-calling. LLMs should not perform arithmetic.',
    explanation: '17% of 250 = 42.5, not 47.5. The model generated a plausible-sounding wrong number. Incorrect answers are bugs — classified as hallucination, Sev2.',
  },
  {
    id: 'f5', title: 'Unbounded API cost spike',
    prompt: '(Automated pipeline — max_tokens not set)',
    output: '[18,400 tokens of tangentially relevant output billed to production account at full rate]',
    correctType: 'cost_spike', severity: 'sev2',
    correctFix: 'Always set max_tokens. Add AWS budget alerts. Implement rate limiting at the application layer.',
    explanation: 'Without a max_tokens cap, a prompt with high temperature or a looping instruction can generate thousands of expensive tokens. Cost spikes are Sev2 — they hit the business directly and immediately.',
  },
  {
    id: 'f6', title: 'Gendered stereotype in output',
    prompt: 'Describe a typical software engineer.',
    output: 'He is usually a young man in his 20s or 30s who drinks coffee, listens to metal music, and stays up coding all night.',
    correctType: 'unsafe_output', severity: 'sev1',
    correctFix: 'Add output validation for stereotyped language. Update the system prompt with inclusive language requirements. Review for training data bias.',
    explanation: 'Gendered, stereotyped output is a Responsible AI violation. Deploying this to users is a Sev1 — it causes direct reputational and potential legal harm.',
  },
];

const TYPE_META: Record<FailureType, { label: string; color: string; icon: React.ReactNode; fix: string }> = {
  hallucination: { label:'Hallucination', color:'var(--amber)', icon:<Bug size={16}/>,         fix:'Grounding · RAG · Tool-calling for math' },
  cost_spike:    { label:'Cost Spike',    color:'var(--blue)',  icon:<TrendingUp size={16}/>,   fix:'max_tokens · Rate limits · Budget alerts' },
  unsafe_output: { label:'Unsafe Output', color:'var(--rose)',  icon:<AlertCircle size={16}/>,  fix:'Sev1 · Safe mode · Guardrails · Content filter' },
};

export default function Module6Failures() {
  const [current, setCurrent]   = useState(0);
  const [guess, setGuess]       = useState<FailureType | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore]       = useState(0);
  const [done, setDone]         = useState(false);

  const failure = FAILURES[current];

  const handleGuess = (type: FailureType) => {
    if (revealed) return;
    setGuess(type);
    setRevealed(true);
    if (type === failure.correctType) setScore(s => s + 1);
  };

  const next = () => {
    if (current + 1 >= FAILURES.length) { setDone(true); return; }
    setCurrent(c => c + 1); setGuess(null); setRevealed(false);
  };

  const restart = () => { setCurrent(0); setScore(0); setDone(false); setGuess(null); setRevealed(false); };

  if (done) {
    const pct = Math.round((score / FAILURES.length) * 100);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="glass" style={{ padding: '40px', textAlign: 'center', animation: 'scaleIn 0.4s ease' }}>
          <div style={{ color: pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--rose)', marginBottom: 14 }}>
            {pct >= 80 ? <CheckCircle2 size={52}/> : <AlertCircle size={52}/>}
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>{score} / {FAILURES.length} correct</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
            {pct >= 80 ? 'Excellent — you can classify GenAI failures with confidence.'
              : pct >= 60 ? 'Good effort. Review the ones you missed.'
              : 'Keep studying — revisit the failure types above and try again.'}
          </p>
          <div className="grid-3" style={{ marginBottom: 24 }}>
            {(Object.entries(TYPE_META) as [FailureType, typeof TYPE_META[FailureType]][]).map(([k, v]) => (
              <div key={k} className="glass-sm" style={{ padding: '14px', textAlign: 'center', borderColor:`color-mix(in srgb, ${v.color} 25%, transparent)` }}>
                <div style={{ color: v.color, marginBottom: 6 }}>{v.icon}</div>
                <div style={{ fontWeight: 700, color: v.color, fontSize: 12.5 }}>{v.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{v.fix}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={restart}>
            <RotateCcw size={13}/> Play again
          </button>
        </div>
      </div>
    );
  }

  const isSev1 = failure.severity === 'sev1' && revealed;

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Theory ──────────────────────────────────────────────────────── */}
      <section className="glass" style={{ padding: '24px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Bug size={18} color="var(--rose)" />
          <h2 style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>
            GenAI Failure Types — Theory
          </h2>
        </div>
        <div className="grid-3" style={{ marginBottom: 18 }}>
          {(Object.entries(TYPE_META) as [FailureType, typeof TYPE_META[FailureType]][]).map(([k, v]) => (
            <TheoryCard key={k} icon={v.icon} accent={v.color} title={v.label} body={
              k === 'hallucination' ? 'The model confidently generates plausible but false information. Incorrect answers and invented facts are bugs. They must be fixed — use grounding, RAG, or tool-calling for factual tasks.'
              : k === 'cost_spike' ? 'Unbounded token generation burns budget rapidly. In automated pipelines, a single unguarded call can cost hundreds of times more than expected. Prevention: max_tokens + rate limits + budget alerts.'
              : 'Output that is harmful, biased, or unsafe — regardless of intent. Unsafe output is an immediate Sev1 requiring immediate resolution before any deployment. Content moderation + guardrails + system prompts are all required.'
            } />
          ))}
        </div>
        <Callout variant="danger">
          <strong>Severity rule:</strong> Hallucinations and incorrect answers = bugs (Sev2/Sev3, tracked in backlog). Unsafe output = <strong>Sev1, immediate response required, do not deploy</strong>.
        </Callout>
      </section>

      {/* ── Game ────────────────────────────────────────────────────────── */}
      <section className="glass" style={{ padding: '22px 26px', position: 'relative' }}>

        {/* SEV1 badge */}
        {isSev1 && (
          <div style={{
            position: 'absolute', top: 18, right: 18,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(244,63,94,0.12)',
            border: '2px solid var(--rose)',
            borderRadius: 10, padding: '7px 14px',
            animation: 'glow-red 1.5s ease-in-out infinite',
            zIndex: 10,
          }}>
            <AlertCircle size={15} color="var(--rose)" />
            <div>
              <div style={{ fontWeight: 800, color: 'var(--rose)', fontSize: 12, lineHeight: 1 }}>SEV1</div>
              <div style={{ fontSize: 10, color: 'rgba(244,63,94,0.6)' }}>IMMEDIATE FIX</div>
            </div>
          </div>
        )}

        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Case {current + 1} of {FAILURES.length}</span>
          <div style={{ display: 'flex', gap: 5 }}>
            {FAILURES.map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i < current ? 'var(--teal)' : i === current ? 'var(--pink)' : 'var(--bg-surface-3)',
              }} />
            ))}
          </div>
          <span className="badge badge-teal">{score}/{current} correct</span>
        </div>

        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{failure.title}</h3>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 7 }}>Prompt sent to model</div>
            <div className="glass-sm" style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
              {failure.prompt}
            </div>
          </div>
          <div>
            <div className="section-label" style={{ marginBottom: 7 }}>Model output</div>
            <div className="code-block" style={{ whiteSpace: 'pre-wrap', fontSize: 12.5, borderRadius: 'var(--r-md)' }}>
              {failure.output}
            </div>
          </div>
        </div>

        {/* Classification buttons */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            What type of failure is this?
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {(Object.entries(TYPE_META) as [FailureType, typeof TYPE_META[FailureType]][]).map(([k, v]) => {
              const isCorrect = k === failure.correctType;
              const isMyGuess = k === guess;
              let bg = 'var(--bg-surface-2)', border = 'var(--border)', color = 'var(--text-secondary)';
              if (revealed) {
                if (isCorrect) { bg = `color-mix(in srgb, ${v.color} 12%, transparent)`; border = `color-mix(in srgb, ${v.color} 45%, transparent)`; color = v.color; }
                else if (isMyGuess) { bg = 'rgba(244,63,94,0.08)'; border = 'rgba(244,63,94,0.35)'; color = 'var(--rose)'; }
              } else if (isMyGuess) {
                bg = `color-mix(in srgb, ${v.color} 12%, transparent)`; border = `color-mix(in srgb, ${v.color} 45%, transparent)`; color = v.color;
              }
              return (
                <button key={k} onClick={() => handleGuess(k)} disabled={revealed}
                  style={{
                    flex: 1, padding: '12px 10px',
                    background: bg, border: `1px solid ${border}`, color,
                    borderRadius: 'var(--r-md)', cursor: revealed ? 'default' : 'pointer',
                    fontSize: 12.5, fontWeight: 600,
                    transition: 'all 0.2s', fontFamily: 'var(--font)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}
                >
                  <span style={{ color }}>{v.icon}</span>
                  <span>{v.label}</span>
                  {revealed && isCorrect  && <span style={{ fontSize: 10 }}><CheckCircle2 size={9}/> Correct</span>}
                  {revealed && isMyGuess && !isCorrect && <span style={{ fontSize: 10 }}><XCircle size={9}/> Your pick</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reveal */}
        {revealed && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <div className="glass-sm" style={{
              padding: '16px 18px', marginBottom: 14,
              borderColor: guess === failure.correctType ? 'rgba(34,197,94,0.3)' : 'rgba(244,63,94,0.3)',
              background: guess === failure.correctType ? 'rgba(34,197,94,0.06)' : 'rgba(244,63,94,0.06)',
            }}>
              <div style={{
                fontWeight: 700, marginBottom: 8,
                color: guess === failure.correctType ? 'var(--green)' : 'var(--rose)',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                {guess === failure.correctType
                  ? <><CheckCircle2 size={15}/> Correct!</>
                  : <><XCircle size={15}/> Incorrect — this is {TYPE_META[failure.correctType].label}</>}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 12 }}>
                {failure.explanation}
              </p>
              <div style={{
                padding: '10px 12px',
                background: `color-mix(in srgb, ${TYPE_META[failure.correctType].color} 8%, transparent)`,
                border: `1px solid color-mix(in srgb, ${TYPE_META[failure.correctType].color} 25%, transparent)`,
                borderRadius: 8, fontSize: 13,
                color: TYPE_META[failure.correctType].color,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Wrench size={13}/> <strong>Fix:</strong> {failure.correctFix}
              </div>
            </div>
            <button className="btn btn-primary" onClick={next}>
              {current + 1 >= FAILURES.length ? 'See results' : 'Next case'}
              <Wrench size={12}/>
            </button>
          </div>
        )}
      </section>
      </div>
      <GlossaryPanelM6 />
    </div>
  );
}
