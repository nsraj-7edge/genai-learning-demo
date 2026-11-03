/**
 * Callout — info/warning/tip/danger banners used throughout modules.
 */
import type { ReactNode } from 'react';
import { Info, AlertTriangle, Lightbulb, XCircle } from 'lucide-react';

type CalloutVariant = 'info' | 'warning' | 'tip' | 'danger';

const META: Record<CalloutVariant, { icon: ReactNode; color: string }> = {
  info:    { icon: <Info    size={14} />, color: 'var(--blue)'  },
  warning: { icon: <AlertTriangle size={14} />, color: 'var(--amber)' },
  tip:     { icon: <Lightbulb size={14} />, color: 'var(--teal)'  },
  danger:  { icon: <XCircle  size={14} />, color: 'var(--rose)'  },
};

interface CalloutProps {
  variant?: CalloutVariant;
  children: ReactNode;
}

export default function Callout({ variant = 'info', children }: CalloutProps) {
  const { icon, color } = META[variant];
  return (
    <div style={{
      display: 'flex',
      gap: 10,
      padding: '11px 14px',
      background: `color-mix(in srgb, ${color} 9%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
      borderRadius: 'var(--r-md)',
      color: 'var(--text-secondary)',
      fontSize: 13,
      lineHeight: 1.6,
    }}>
      <span style={{ color, marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}
