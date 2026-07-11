import { useRef } from 'react';
import { Body, PrimaryButton } from '../components/Chrome';

// Step 1 — Camera. Opens the phone camera directly (capture="environment"), no live view.
// If offline, the user must consciously opt in (Stage 2 decision).
export function CameraScreen({ online, offlineOptIn, onOfflineOptIn, onCapture }: {
  online: boolean;
  offlineOptIn: boolean;
  onOfflineOptIn: () => void;
  onCapture: (image: Blob) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const blocked = !online && !offlineOptIn;

  return (
    <Body>
      <div style={{ height: 300, border: '3px dashed var(--color-primary)', borderRadius: 'var(--radius)',
        display: 'grid', placeItems: 'center', textAlign: 'center', color: 'var(--ink-soft)', marginBottom: 18 }}>
        מלא את הפריים עם כל הסטנד
      </div>

      {!online && (
        <div style={{ background: '#fff7d6', border: '1px solid var(--color-accent)', borderRadius: 'var(--radius)',
          padding: 14, marginBottom: 16, fontSize: 14 }}>
          <strong>אין חיבור לאינטרנט.</strong> אפשר להמשיך במצב לא-מקוון — ההערכה תהיה זמנית
          ותעודכן אוטומטית כשהחיבור יחזור.
          {!offlineOptIn && (
            <button onClick={onOfflineOptIn}
              style={{ marginTop: 10, width: '100%', padding: 12, borderRadius: 10,
                border: '1px solid var(--color-primary)', background: 'transparent', fontWeight: 700 }}>
              המשך במצב לא-מקוון
            </button>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onCapture(f); }} />

      <PrimaryButton disabled={blocked} onClick={() => inputRef.current?.click()}>
        צלם את הסטנד
      </PrimaryButton>
    </Body>
  );
}
