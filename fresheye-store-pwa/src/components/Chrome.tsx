import type { ReactNode } from 'react';

export function Header({ online }: { online: boolean }) {
  return (
    <header style={{ background: 'var(--color-primary)', color: '#fff', padding: '14px 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <strong style={{ fontWeight: 800, letterSpacing: '.2px' }}>🫐 FreshEye</strong>
      <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, opacity: .9 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%',
          background: online ? 'var(--color-leaf)' : 'var(--status-moderate)' }} />
        {online ? 'מקוון' : 'לא מקוון'}
      </span>
    </header>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return <main style={{ flex: 1, overflowY: 'auto', padding: 18 }}>{children}</main>;
}

export function PrimaryButton({ children, onClick, disabled }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        width: '100%', padding: '16px', border: 'none', borderRadius: 'var(--radius)',
        background: disabled ? '#c9c2b3' : 'var(--color-primary)', color: '#fff',
        fontSize: 17, fontWeight: 700,
      }}>
      {children}
    </button>
  );
}
