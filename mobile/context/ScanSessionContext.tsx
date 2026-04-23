import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedItem {
  id: number;
  category: string;
  color: string;
  image_url?: string;
}

export interface ScanSessionState {
  items: SavedItem[];
  startedAt: number;
  categoryCounts: Record<string, number>;
  addItem: (item: SavedItem) => void;
  reset: () => void;
  isActive: boolean;
  start: () => void;
  end: () => void;
}

const STORAGE_KEY = '@smart_scan_session';

const ScanSessionContext = createContext<ScanSessionState | undefined>(undefined);

type Persisted = {
  items: SavedItem[];
  startedAt: number;
  isActive: boolean;
};

function computeCounts(items: SavedItem[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] ?? 0) + 1;
    return acc;
  }, {});
}

export function ScanSessionProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [isActive, setIsActive] = useState(false);

  // Restore a mid-session crash.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: Persisted = JSON.parse(raw);
          if (parsed.isActive && Array.isArray(parsed.items)) {
            setItems(parsed.items);
            setStartedAt(parsed.startedAt || Date.now());
            setIsActive(true);
          }
        }
      } catch {
        // non-fatal
      }
    })();
  }, []);

  const persist = useCallback(async (next: Persisted) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // non-fatal
    }
  }, []);

  const addItem = useCallback(
    (item: SavedItem) => {
      setItems((prev) => {
        const next = [...prev, item];
        persist({ items: next, startedAt, isActive: true });
        return next;
      });
    },
    [persist, startedAt]
  );

  const reset = useCallback(() => {
    setItems([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const start = useCallback(() => {
    const now = Date.now();
    setStartedAt(now);
    setItems([]);
    setIsActive(true);
    persist({ items: [], startedAt: now, isActive: true });
  }, [persist]);

  const end = useCallback(() => {
    setIsActive(false);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return (
    <ScanSessionContext.Provider
      value={{
        items,
        startedAt,
        categoryCounts: computeCounts(items),
        addItem,
        reset,
        isActive,
        start,
        end,
      }}
    >
      {children}
    </ScanSessionContext.Provider>
  );
}

export function useScanSession(): ScanSessionState | undefined {
  return useContext(ScanSessionContext);
}
