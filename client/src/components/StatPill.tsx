/**
 * StatPill — compact stat display used in output areas and dashboards.
 */
interface StatPillProps {
  label: string;
  value: string | number;
  color?: string;
  mono?: boolean;
}

export default function StatPill({ label, value, color = 'var(--blue)', mono = true }: StatPillProps) {
  return (
    <div className="glass-sm" style={{
      padding: '10px 14px',
      textAlign: 'center',
      flex: '1 1 100px',
    }}>
      <div style={{
        fontWeight: 700,
        fontSize: 18,
        color,
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font)',
        letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      <div className="section-label" style={{ marginTop: 3 }}>{label}</div>
    </div>
  );
}
