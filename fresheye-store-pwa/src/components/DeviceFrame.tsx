import type { ReactNode } from 'react';

// 390×844 device frame from the Design handoff — keeps the pilot mockup dimensions.
export function DeviceFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div
        style={{
          width: 'var(--frame-w)', height: 'var(--frame-h)', maxWidth: '100%',
          background: 'var(--color-cream)', borderRadius: 28, overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
}
