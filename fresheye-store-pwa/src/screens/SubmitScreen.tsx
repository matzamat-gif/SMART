import { Body, PrimaryButton } from '../components/Chrome';
import type { LocalScan } from '../types/domain';

// Step 4 — Submit to chain (online) or queue in the outbox (offline).
export function SubmitScreen({ scan, online, done, onSubmit }: {
  scan: LocalScan; online: boolean; done: boolean; onSubmit: () => void;
}) {
  if (done) {
    return (
      <Body>
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <div style={{ fontSize: 52 }}>{scan.status === 'submitted' ? '✓' : '⏳'}</div>
          <h2 style={{ margin: '12px 0 4px' }}>
            {scan.status === 'submitted' ? 'נשלח לרשת' : 'ממתין לחיבור'}
          </h2>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
            {scan.status === 'submitted'
              ? 'הבקשה נקלטה בדשבורד הרשת.'
              : 'הסריקה נשמרה בתור ותישלח אוטומטית כשהחיבור יחזור. הענן ינתח מחדש ויאמת לפני השליחה.'}
          </p>
        </div>
      </Body>
    );
  }

  return (
    <Body>
      <p style={{ fontSize: 15, lineHeight: 1.6 }}>
        {online
          ? 'הבקשה תישלח לרשת עם אישורך.'
          : 'אין חיבור — הבקשה תישמר בתור ותישלח אוטומטית כשהחיבור יחזור.'}
      </p>
      <div style={{ marginTop: 18 }}>
        <PrimaryButton onClick={onSubmit}>
          {online ? 'שלח לרשת' : 'שמור לשליחה'}
        </PrimaryButton>
      </div>
    </Body>
  );
}
