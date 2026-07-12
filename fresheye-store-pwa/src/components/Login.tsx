import { ChevronLeft, Leaf, ShieldCheck, Store, User as UserIcon } from 'lucide-react';
import type { User } from '../types';
import { BRANCHES, ROLE_LABELS, SEED_USERS } from '../data/seed';
import { C } from '../lib/brand';

const ROLE_ICONS = { clerk: UserIcon, manager: Store, exec: ShieldCheck } as const;

export function Login({ onLogin }: { onLogin: (u: User) => void }) {
  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6" style={{ background: C.green }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex rounded-2xl p-3 mb-3" style={{ background: C.yellow }}>
            <Leaf className="w-8 h-8" style={{ color: C.green }} />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">נוי השדה</h1>
          <p className="text-sm mt-1" style={{ color: C.leaf }}>בחר משתמש כדי להיכנס</p>
        </div>
        <div className="space-y-3">
          {SEED_USERS.map((u) => {
            const Icon = ROLE_ICONS[u.role];
            const b = BRANCHES.find((x) => x.id === u.branch);
            return (
              <button
                key={u.id}
                onClick={() => onLogin(u)}
                className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 text-right active:scale-[0.98] transition shadow-sm"
              >
                <div className="rounded-xl p-2.5" style={{ background: C.greenSoft, color: C.green }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold" style={{ color: C.green }}>{u.name}</p>
                  <p className="text-stone-500 text-xs">{ROLE_LABELS[u.role]}{b ? ` · ${b.short}` : ''}</p>
                </div>
                <ChevronLeft className="w-5 h-5 text-stone-300" />
              </button>
            );
          })}
        </div>
        <p className="text-xs text-center mt-6" style={{ color: 'rgba(164,214,104,0.7)' }}>
          דמו — זיהוי משתמש אמיתי יתחבר ל-SSO ארגוני
        </p>
      </div>
    </div>
  );
}
