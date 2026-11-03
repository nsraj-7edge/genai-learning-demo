import { ChevronRight, BookOpen, Cpu, Zap, Award } from 'lucide-react';

const TOPICS = [
  { n:'01', title:'How LLMs generate text',        desc:'Models pick the next token from a probability distribution; settings change how that choice is made.' },
  { n:'02', title:'Temperature & Top P',            desc:'Low values give deterministic, factual output; higher values give diverse, creative output. Change one, not both.' },
  { n:'03', title:'Max length & stop sequences',   desc:'Cap the tokens generated to control length and cost; stop sequences end output at a defined point.' },
  { n:'04', title:'Frequency & presence penalties',desc:'Reduce repetition: frequency scales with how often a token appears, presence applies the same flat penalty to any repeat.' },
  { n:'05', title:'Approved model landscape',      desc:'Anthropic Claude, OpenAI, Azure OpenAI and approved open-source models are the only permitted choices.' },
  { n:'06', title:'Model & architecture choice',   desc:'Select a model with written justification; decide RAG vs non-RAG and the memory strategy before building.' },
  { n:'07', title:'GenAI risks',                   desc:'Hallucination, cost spikes and unsafe output. Hallucinations are bugs; unsafe output is an immediate Sev1.' },
  { n:'08', title:'Troubleshooting basics',        desc:'Unsafe output: safe mode + lower temperature. Hallucination: add grounding. Cost spike: rate limits + fewer tokens.' },
  { n:'09', title:'Responsible AI',                desc:'Guardrails, input and output validation and schema enforcement are mandatory — not optional extras.' },
];

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '0 24px 80px',
    }}>

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header style={{
        width: '100%', maxWidth: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--blue), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
          }}>
            <Cpu size={17} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>
            GenAI Fundamentals
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-blue">Experiential Learning</span>
          <span className="badge badge-purple">Bundle 1</span>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 900, textAlign: 'center', marginBottom: 64 }}>

        {/* Bundle label */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.22)',
          borderRadius: 99, padding: '6px 16px',
          fontSize: 12.5, fontWeight: 600, color: 'var(--blue)',
          marginBottom: 24, letterSpacing: '0.02em',
        }}>
          <BookOpen size={13} /> Bundle 1 of the GenAI Engineer Track
        </div>

        {/* Main heading */}
        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.12,
          marginBottom: 20,
          background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.55) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Generative AI &amp;<br />LLM Fundamentals
        </h1>

        {/* Learning goal */}
        <p style={{
          fontSize: 17,
          color: 'var(--text-secondary)',
          lineHeight: 1.65,
          maxWidth: 620,
          margin: '0 auto 32px',
        }}>
          Understand how LLMs generate output, which settings control that output,
          and the risks a GenAI engineer is responsible for managing.
        </p>

        {/* Stat pills */}
        <div style={{
          display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40,
        }}>
          {[
            { icon:<Zap size={13}/>,   label:'7 Interactive modules' },
            { icon:<Cpu size={13}/>,   label:'Live AWS Bedrock calls' },
            { icon:<Award size={13}/>, label:'Readiness check included' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 99, padding: '7px 16px',
              fontSize: 13, color: 'var(--text-secondary)',
            }}>
              <span style={{ color: 'var(--blue)' }}>{s.icon}</span>
              {s.label}
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={onStart}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 36px',
            background: 'linear-gradient(135deg, var(--blue), var(--purple))',
            border: 'none', borderRadius: 99,
            color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '-0.01em',
            boxShadow: '0 6px 28px rgba(59,130,246,0.45), 0 0 0 1px rgba(255,255,255,0.12) inset',
            transition: 'transform 0.15s, box-shadow 0.15s',
            fontFamily: 'var(--font)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 36px rgba(59,130,246,0.6), 0 0 0 1px rgba(255,255,255,0.15) inset';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 28px rgba(59,130,246,0.45), 0 0 0 1px rgba(255,255,255,0.12) inset';
          }}
        >
          Start Learning
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Topics grid ─────────────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 900 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
        }}>
          <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
          <span className="section-label">9 Topics you will master</span>
          <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
          marginBottom: 48,
        }}>
          {TOPICS.map((t) => (
            <div
              key={t.n}
              className="glass-sm"
              style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}
            >
              <span style={{
                fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-mono)',
                color: 'var(--blue)', background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.22)',
                borderRadius: 6, padding: '2px 6px', flexShrink: 0, lineHeight: 1.5,
                marginTop: 1,
              }}>{t.n}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Readiness check */}
        <div className="glass" style={{ padding: '22px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Award size={16} color="var(--amber)" />
            <div style={{ fontWeight: 700, fontSize: 14 }}>Readiness Check</div>
            <span className="badge badge-amber" style={{ marginLeft: 'auto' }}>End of bundle</span>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
            You will pick and justify the right settings for a <strong style={{ color: 'var(--text-primary)' }}>fact-based QA task</strong> and a <strong style={{ color: 'var(--text-primary)' }}>creative task</strong>,
            then classify three sample failure outputs by <strong style={{ color: 'var(--text-primary)' }}>GenAI risk type and severity</strong>.
            All directly inside the modules — no external exam.
          </p>
        </div>
      </div>
    </div>
  );
}
