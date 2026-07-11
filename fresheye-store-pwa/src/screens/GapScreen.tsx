import { Body, PrimaryButton } from '../components/Chrome';
import type { LocalScan, ShortageStatus } from '../types/domain';
import { totals } from '../state/scanMachine';

const STATUS_COLOR: Record<ShortageStatus, string> = {
  out_of_stock: 'var(--status-critical)',
  critical: 'var(--status-critical)',
  moderate: 'var(--status-moderate)',
  ok: 'var(--status-ok)',
  surplus: 'var(--status-surplus)',
  unconfirmed: 'var(--ink-soft)',
};

// Step 3 — Gap vs daily quota (pure rules). Explains the number, not just shows it.
export function GapScreen({ scan, onContinue }: { scan: LocalScan; onContinue: () => void }) {
  const t = totals(scan);
  return (
    <Body>
      {scan.items.map((it) => (
        <div key={it.produce_item_id}
          style={{ background: '#fff', borderRadius: 'var(--radius)', padding: 14, marginBottom: 10,
            borderInlineStart: `6px solid ${STATUS_COLOR[it.shortage_status]}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{it.name_he}</strong>
            <span style={{ color: STATUS_COLOR[it.shortage_status], fontWeight: 700 }}>
              חסר {it.gap_kg.toFixed(1)} ק"ג
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
            יש {it.total_weight_kg.toFixed(1)} ק"ג · מכסה {it.daily_quota_kg.toFixed(1)} ק"ג
          </div>
        </div>
      ))}

      <div style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius)',
        padding: 14, margin: '14px 0', display: 'flex', justifyContent: 'space-between' }}>
        <span>סה"כ חסר</span><strong>{t.gap.toFixed(1)} ק"ג</strong>
      </div>

      <PrimaryButton onClick={onContinue}>המשך לשליחה</PrimaryButton>
    </Body>
  );
}
