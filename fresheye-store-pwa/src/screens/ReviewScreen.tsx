import { Body, PrimaryButton } from '../components/Chrome';
import type { LocalScan } from '../types/domain';
import { weightBreakdown } from '../lib/rules';
import type { ProduceItemConfig } from '../types/domain';

// Step 2 — Manager review + confirm. Low-confidence rows surface first, marked orange.
// Nothing advances until every row has a confirmed count (the confirmation gate).
export function ReviewScreen({ scan, catalog, onCorrect, onConfirmAll, canAdvance }: {
  scan: LocalScan;
  catalog: ProduceItemConfig[];
  onCorrect: (itemId: string, units: number) => void;
  onConfirmAll: () => void;
  canAdvance: boolean;
}) {
  return (
    <Body>
      {scan.estimate_source === 'heuristic' && (
        <div style={{ background: '#fff7d6', borderRadius: 10, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
          הערכה זמנית — תעודכן בחיבור לרשת
        </div>
      )}

      {scan.items.map((it) => {
        const item = catalog.find((c) => c.id === it.produce_item_id);
        const units = it.confirmed_units ?? it.detected_units;
        return (
          <div key={it.produce_item_id}
            style={{ background: '#fff', borderRadius: 'var(--radius)', padding: 14, marginBottom: 12,
              border: it.is_low_confidence ? '2px solid var(--status-moderate)' : '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{it.name_he}</strong>
              {it.is_low_confidence && (
                <span style={{ fontSize: 12, color: 'var(--status-moderate)' }}>ודאות נמוכה — בדוק</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
              <button aria-label="הפחת" onClick={() => item && onCorrect(it.produce_item_id, Math.max(0, units - 1))}
                style={stepBtn}>−</button>
              <span style={{ minWidth: 64, textAlign: 'center', fontWeight: 700 }}>{units} יח'</span>
              <button aria-label="הוסף" onClick={() => item && onCorrect(it.produce_item_id, units + 1)}
                style={stepBtn}>+</button>
              <span style={{ marginInlineStart: 'auto', fontSize: 13, color: 'var(--ink-soft)' }}>
                {item ? weightBreakdown(units, item) : ''}
              </span>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 8 }}>
        <PrimaryButton onClick={onConfirmAll} disabled={!canAdvance}>
          אשר הכל והמשך
        </PrimaryButton>
      </div>
    </Body>
  );
}

const stepBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 10, border: '1px solid var(--color-primary)',
  background: '#fff', fontSize: 22, fontWeight: 700, lineHeight: 1,
};
