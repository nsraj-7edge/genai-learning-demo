/**
 * TheoryCard — explains one concept before the learner interacts.
 * Accepts an optional `visual` ReactNode for graphs/diagrams (replaces code blocks).
 */
import type { ReactNode } from 'react';

interface TheoryCardProps {
  icon: ReactNode;
  title: string;
  simple: string;       // Plain-English explanation for anyone
  technical?: string;   // Optional deeper technical detail
  visual?: ReactNode;   // Chart, formula, diagram — no code
  accent?: string;
}

export default function TheoryCard({
  icon, title, simple, technical, visual, accent = 'var(--blue)',
}: TheoryCardProps) {
  return (
    <div className="glass-sm" style={{
      padding: '18px 20px',
      borderColor: `color-mix(in srgb, ${accent} 22%, transparent)`,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accent} 28%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
        }}>
          {icon}
        </span>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          {title}
        </span>
      </div>

      {/* Plain-English explanation */}
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
        {simple}
      </p>

      {/* Visual (graph / formula / diagram) */}
      {visual && (
        <div style={{
          background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10, padding: '12px 14px',
        }}>
          {visual}
        </div>
      )}

      {/* Optional technical detail in a subtle callout */}
      {technical && (
        <div style={{
          padding: '7px 11px',
          background: `color-mix(in srgb, ${accent} 7%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accent} 20%, transparent)`,
          borderRadius: 8, fontSize: 12, color: `color-mix(in srgb, ${accent} 75%, white)`,
          lineHeight: 1.55,
        }}>
          <span style={{ fontWeight: 700, marginRight: 4 }}>Technical:</span>{technical}
        </div>
      )}
    </div>
  );
}
