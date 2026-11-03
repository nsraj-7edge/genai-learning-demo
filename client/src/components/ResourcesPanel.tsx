/**
 * ResourcesPanel — slide-up modal with official docs links for the current module.
 * Links open in a new tab.
 */
import { X, ExternalLink } from 'lucide-react';
import type { Resource } from '../data/resources';

const TYPE_STYLE: Record<Resource['type'], { label: string; color: string }> = {
  aws:       { label: 'AWS',       color: 'var(--amber)'  },
  anthropic: { label: 'Anthropic', color: 'var(--purple)' },
  openai:    { label: 'OpenAI',    color: 'var(--green)'  },
  azure:     { label: 'Azure',     color: 'var(--sky)'    },
  guide:     { label: 'Guide',     color: 'var(--blue)'   },
  owasp:     { label: 'OWASP',     color: 'var(--rose)'   },
};

interface ResourcesPanelProps {
  resources: Resource[];
  moduleLabel: string;
  onClose: () => void;
}

export default function ResourcesPanel({ resources, moduleLabel, onClose }: ResourcesPanelProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 300,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: 'rgba(10,12,28,0.97)',
        backdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderBottom: 'none',
        borderRadius: '20px 20px 0 0',
        padding: '24px 28px 40px',
        zIndex: 400,
        maxHeight: '75vh',
        overflowY: 'auto',
        animation: 'slideUp 0.3s ease',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
      }}>
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Official Resources</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {moduleLabel} — click any link to open in a new tab
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Resources list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {resources.map((r, i) => {
            const meta = TYPE_STYLE[r.type];
            return (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  textDecoration: 'none',
                  transition: 'background 0.15s, border-color 0.15s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                  (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in srgb, ${meta.color} 40%, transparent)`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                <div style={{
                  paddingTop: 1,
                  background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${meta.color} 25%, transparent)`,
                  borderRadius: 6, padding: '2px 8px',
                  fontSize: 10, fontWeight: 700, color: meta.color,
                  flexShrink: 0, whiteSpace: 'nowrap',
                  height: 'fit-content',
                }}>
                  {meta.label}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)',
                    marginBottom: 3, display: 'flex', alignItems: 'center', gap: 7,
                  }}>
                    {r.label}
                    <ExternalLink size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {r.description}
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Bottom note */}
        <div style={{
          marginTop: 18, fontSize: 11, color: 'var(--text-subtle)',
          textAlign: 'center',
        }}>
          All links open official documentation in a new browser tab
        </div>
      </div>
    </>
  );
}
