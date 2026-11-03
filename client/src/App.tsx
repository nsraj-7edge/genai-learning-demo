import { useState, useEffect } from 'react';
import {
  Cpu, Thermometer, Ruler, Repeat2, LayoutGrid,
  Target, Shield, CheckCircle, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, BookOpen, MemoryStick,
} from 'lucide-react';
import { fetchHealth } from './api/client';
import LandingPage       from './LandingPage';
import ResourcesPanel    from './components/ResourcesPanel';
import { MODULE_RESOURCES } from './data/resources';
import Module1TokenGen    from './modules/Module1_TokenGen';
import Module2TempTopP    from './modules/Module2_TempTopP';
import Module3MaxLength   from './modules/Module3_MaxLength';
import Module4Penalties   from './modules/Module4_Penalties';
import Module5Models      from './modules/Module5_Models';
import Module6Failures    from './modules/Module6_Failures';
import Module7Guardrails  from './modules/Module7_Guardrails';
import Module8Memory      from './modules/Module8_Memory';

interface Module {
  id: number;
  icon: React.ReactNode;
  label: string;
  short: string;
  color: string;
  description: string;
}

const MODULES: Module[] = [
  { id:1, icon:<Cpu size={14}/>,         label:'Token Generation',      short:'Tokens',    color:'var(--blue)',   description:'How LLMs generate text one token at a time' },
  { id:2, icon:<Thermometer size={14}/>, label:'Temperature & Top P',   short:'Temp/TopP', color:'var(--purple)', description:'Controlling randomness and sampling behaviour' },
  { id:3, icon:<Ruler size={14}/>,       label:'Max Tokens & Stops',    short:'Length',    color:'var(--teal)',   description:'Capping output length and cost with stop conditions' },
  { id:4, icon:<Repeat2 size={14}/>,     label:'Frequency & Presence',  short:'Penalties', color:'var(--amber)',  description:'Reducing repetition with penalty parameters' },
  { id:5, icon:<LayoutGrid size={14}/>,  label:'Model Selection',       short:'Models',    color:'var(--pink)',   description:'Choosing the right model and architecture' },
  { id:6, icon:<Target size={14}/>,      label:'Failure Classification',short:'Failures',  color:'var(--rose)',   description:'Identifying and resolving GenAI failure types' },
  { id:7, icon:<Shield size={14}/>,      label:'Responsible AI',        short:'Guardrails',color:'var(--green)',  description:'Guardrails, validation, and responsible deployment' },
  { id:8, icon:<MemoryStick size={14}/>, label:'Session & Memory',      short:'Memory',    color:'var(--purple)', description:'How LLMs remember — session storage, short/long-term memory' },
];

type HealthState = 'loading' | 'ok' | 'error';

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [active, setActive]           = useState(1);
  const [health, setHealth]           = useState<{ region: string; profile: string; model: string } | null>(null);
  const [healthState, setHealthState] = useState<HealthState>('loading');
  const [showResources, setShowResources] = useState(false);

  useEffect(() => {
    fetchHealth()
      .then(h => { setHealth(h); setHealthState('ok'); })
      .catch(() => setHealthState('error'));
  }, []);

  // ── Landing page ─────────────────────────────────────────────────────
  if (showLanding) {
    return (
      <div style={{ minHeight: '100vh', animation: 'fadeUp 0.5s ease' }}>
        <LandingPage onStart={() => setShowLanding(false)} />
      </div>
    );
  }

  const mod    = MODULES.find(m => m.id === active)!;
  const canBack = active > 1;
  const canNext = active < MODULES.length;
  const resources = MODULE_RESOURCES[active] ?? [];

  const iconLarge = [
    <Cpu size={20}/>, <Thermometer size={20}/>, <Ruler size={20}/>,
    <Repeat2 size={20}/>, <LayoutGrid size={20}/>, <Target size={20}/>,
    <Shield size={20}/>, <MemoryStick size={20}/>,
  ][active - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 52,
        background: 'rgba(2, 8, 23, 0.82)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Brand — click to return to landing */}
        <button
          onClick={() => setShowLanding(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px', borderRadius: 8,
            transition: 'background 0.15s',
            fontFamily: 'var(--font)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, var(--blue), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Cpu size={14} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--text-primary)' }}>
              GenAI Fundamentals
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.1 }}>Bundle 1</div>
          </div>
        </button>

        {/* Server status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          background: healthState === 'error' ? 'var(--rose-dim)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${healthState === 'error' ? 'rgba(244,63,94,0.3)' : 'var(--border)'}`,
          borderRadius: 99, fontSize: 11.5,
        }}>
          {healthState === 'loading' && <Loader2 size={10} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} />}
          {healthState === 'ok'      && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', animation:'pulse-ring 2s infinite', flexShrink:0 }} />}
          {healthState === 'error'   && <AlertCircle size={10} color="var(--rose)" />}
          <span style={{ color: healthState === 'error' ? 'var(--rose)' : 'var(--text-secondary)' }}>
            {healthState === 'error'   ? 'Server offline'
              : healthState === 'loading' ? 'Connecting…'
              : `${health?.region} · ${health?.profile}`}
          </span>
          {healthState === 'ok' && <CheckCircle size={10} color="var(--green)" />}
        </div>
      </header>

      {/* ── Module Navigation — equal-width tabs ───────────────────────── */}
      <nav style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${MODULES.length}, 1fr)`,
        background: 'rgba(255,255,255,0.015)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 52, zIndex: 90,
      }}>
        {MODULES.map(m => {
          const isActive = m.id === active;
          return (
            <button key={m.id} onClick={() => setActive(m.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 2,
              padding: '7px 4px',
              background: isActive
                ? `color-mix(in srgb, ${m.color} 10%, rgba(255,255,255,0.02))`
                : 'transparent',
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              borderBottom: isActive ? `2px solid ${m.color}` : '2px solid transparent',
              color: isActive ? m.color : 'rgba(255,255,255,0.38)',
              cursor: 'pointer', fontFamily: 'var(--font)',
              transition: 'all 0.18s ease', minWidth: 0,
            }}>
              <span style={{ display:'flex', alignItems:'center', opacity: isActive ? 1 : 0.55 }}>
                {m.icon}
              </span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, lineHeight: 1, whiteSpace:'nowrap', letterSpacing:'-0.01em' }}>
                {m.short}
              </span>
              <span style={{ fontSize: 8.5, color: isActive ? `color-mix(in srgb, ${m.color} 80%, white)` : 'rgba(255,255,255,0.18)', lineHeight: 1 }}>
                {m.id}/{MODULES.length}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main key={active} style={{
        flex: 1, padding: '22px 20px 90px',
        maxWidth: [1, 2, 3, 4, 5, 6, 7, 8].includes(active) ? 1520 : 1200, width: '100%', margin: '0 auto',
        animation: 'fadeUp 0.32s ease both',
      }}>
        {/* Module header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:8 }}>
            <div style={{
              width:40, height:40, borderRadius:10, flexShrink:0,
              background:`color-mix(in srgb, ${mod.color} 14%, transparent)`,
              border:`1px solid color-mix(in srgb, ${mod.color} 28%, transparent)`,
              display:'flex', alignItems:'center', justifyContent:'center', color:mod.color,
            }}>
              {iconLarge}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <h1 style={{
                  fontSize:22, fontWeight:800, letterSpacing:'-0.03em',
                  background:`linear-gradient(90deg, ${mod.color} 0%, var(--text-primary) 60%)`,
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1.2,
                }}>
                  {mod.label}
                </h1>
                {/* Resources button */}
                <button
                  onClick={() => setShowResources(true)}
                  style={{
                    display:'flex', alignItems:'center', gap:5,
                    padding:'4px 12px',
                    background:'rgba(255,255,255,0.05)',
                    border:'1px solid rgba(255,255,255,0.1)',
                    borderRadius:99, cursor:'pointer',
                    color:'var(--text-secondary)', fontSize:11.5, fontWeight:600,
                    transition:'all 0.15s', fontFamily:'var(--font)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                  }}
                >
                  <BookOpen size={11}/> Resources
                </button>
              </div>
              <p style={{ color:'var(--text-muted)', fontSize:12, margin:0 }}>
                Module {mod.id} of {MODULES.length} — {mod.description}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height:2, background:'var(--bg-surface-3)', borderRadius:99, overflow:'hidden' }}>
            <div style={{
              height:'100%', width:`${(mod.id/MODULES.length)*100}%`,
              background:`linear-gradient(90deg, ${mod.color}55, ${mod.color})`,
              borderRadius:99, transition:'width 0.5s ease',
            }} />
          </div>
        </div>

        {active === 1 && <Module1TokenGen />}
        {active === 2 && <Module2TempTopP />}
        {active === 3 && <Module3MaxLength />}
        {active === 4 && <Module4Penalties />}
        {active === 5 && <Module5Models />}
        {active === 6 && <Module6Failures />}
        {active === 7 && <Module7Guardrails />}
        {active === 8 && <Module8Memory />}
      </main>

      {/* ── Nav arrows ──────────────────────────────────────────────────── */}
      <div style={{ position:'fixed', bottom:20, right:20, display:'flex', gap:8, zIndex:200 }}>
        <button className="btn btn-ghost" disabled={!canBack} onClick={() => setActive(a => a - 1)}>
          <ChevronLeft size={14}/> Back
        </button>
        <button className="btn btn-primary" disabled={!canNext} onClick={() => setActive(a => a + 1)}>
          Next <ChevronRight size={14}/>
        </button>
      </div>

      {/* ── Resources panel ─────────────────────────────────────────────── */}
      {showResources && (
        <ResourcesPanel
          resources={resources}
          moduleLabel={mod.label}
          onClose={() => setShowResources(false)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );
}
