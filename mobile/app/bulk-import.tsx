import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useI18n } from '../lib/i18n';
import { wardrobeAPI } from '../lib/api';
import { useScanSession } from '../context/ScanSessionContext';
import SwipeConfirmStack, { SwipeCard } from '../components/SwipeConfirmStack';

// FLAG: we cache tag results keyed by (filename + file size). This
// avoids billing the same image twice within a session and across
// sessions on the same device. A content hash (SHA-256 via
// expo-crypto) would be more robust but expo-crypto is not installed
// and adding it requires user approval.
type CacheEntry = {
  category?: string;
  color?: string;
  sub_category?: string;
  brand?: string;
  season?: string;
};
const cache = new Map<string, CacheEntry>();

const BATCH_SIZE = 5;

type Pending = {
  uri: string;
  cacheKey: string;
  suggestion?: CacheEntry;
  ready: boolean;
};

async function buildCacheKey(uri: string): Promise<string> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    const size = (info as any)?.size ?? 0;
    const name = uri.split('/').pop() || uri;
    return `${name}::${size}`;
  } catch {
    return uri;
  }
}

export default function BulkImport() {
  const { t } = useI18n();
  const session = useScanSession();
  const params = useLocalSearchParams<{ uris?: string }>();
  const uris = useMemo(
    () => (params.uris ? String(params.uris).split('|').filter(Boolean) : []),
    [params.uris]
  );

  const [pending, setPending] = useState<Pending[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    (async () => {
      const seeded = await Promise.all(
        uris.map(async (uri) => {
          const cacheKey = await buildCacheKey(uri);
          const cached = cache.get(cacheKey);
          return {
            uri,
            cacheKey,
            suggestion: cached,
            ready: !!cached,
          } satisfies Pending;
        })
      );
      setPending(seeded);
      setProcessedCount(seeded.filter((p) => p.ready).length);
      setLoading(false);
      // Fire batch processing for the un-cached items.
      processBatches(seeded);
    })();
    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processBatches = async (items: Pending[]) => {
    const queue = items.filter((p) => !p.ready);
    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      if (cancelled.current) return;
      const batch = queue.slice(i, i + BATCH_SIZE);
      // Try bulk endpoint first; fall back to per-image analyze.
      const results = await tagBatch(batch);
      setPending((prev) => {
        const next = [...prev];
        batch.forEach((p, idx) => {
          const r = results[idx];
          const entryIdx = next.findIndex((n) => n.cacheKey === p.cacheKey);
          if (entryIdx === -1) return;
          next[entryIdx] = { ...next[entryIdx], suggestion: r, ready: true };
          if (r) cache.set(p.cacheKey, r);
        });
        return next;
      });
      setProcessedCount((c) => c + batch.length);
    }
  };

  const tagBatch = async (batch: Pending[]): Promise<(CacheEntry | undefined)[]> => {
    const fd = new FormData();
    batch.forEach((p, i) => {
      const filename = p.uri.split('/').pop() || `photo_${i}.jpg`;
      const mt = /\.(\w+)$/.exec(filename);
      const type = mt ? `image/${mt[1]}` : 'image/jpeg';
      fd.append(`image_${i}`, { uri: p.uri, name: filename, type } as any);
    });
    try {
      const res = await wardrobeAPI.bulkTag(fd);
      const results: any[] = res.data?.results ?? [];
      return batch.map((_, i) => results.find((r) => r.index === i)?.suggestions);
    } catch {
      // Fallback: per-image analyzeImage.
      return Promise.all(
        batch.map(async (p) => {
          try {
            const fd1 = new FormData();
            const filename = p.uri.split('/').pop() || 'photo.jpg';
            const mt = /\.(\w+)$/.exec(filename);
            const type = mt ? `image/${mt[1]}` : 'image/jpeg';
            fd1.append('image', { uri: p.uri, name: filename, type } as any);
            const r = await wardrobeAPI.analyzeImage(fd1);
            return r.data?.suggestions as CacheEntry | undefined;
          } catch {
            return undefined;
          }
        })
      );
    }
  };

  const current = pending[cursor];
  const currentReady = current?.ready;

  const buildCard = (p: Pending | undefined): SwipeCard | null => {
    if (!p) return null;
    const s = p.suggestion;
    return {
      key: p.cacheKey,
      imageUri: p.uri,
      title: s?.category ? t(`addItem.categories.${s.category}`) : t('addItem.title'),
      subtitle: s?.color ? t(`addItem.colors.${s.color}`) : '',
    };
  };

  const advance = () => setCursor((c) => c + 1);

  const handleConfirm = async () => {
    if (!current || !current.suggestion) return;
    const s = current.suggestion;
    try {
      const fd = new FormData();
      const filename = current.uri.split('/').pop() || 'photo.jpg';
      const mt = /\.(\w+)$/.exec(filename);
      const type = mt ? `image/${mt[1]}` : 'image/jpeg';
      fd.append('image', { uri: current.uri, name: filename, type } as any);
      if (s.category) fd.append('category', s.category);
      if (s.color) fd.append('color', s.color);
      if (s.season) fd.append('season', s.season);
      if (s.sub_category) fd.append('sub_category', s.sub_category);
      if (s.brand) fd.append('brand', s.brand);
      fd.append('ai_tags', JSON.stringify(s));
      const res = await wardrobeAPI.addItem(fd);
      const saved = res.data?.item ?? res.data;
      if (saved && session) {
        session.addItem({
          id: saved.id,
          category: s.category ?? 'accessories',
          color: s.color ?? '',
          image_url: saved.image_url ?? current.uri,
        });
      }
      setSavedCount((n) => n + 1);
    } catch (e) {
      // Silent skip — user keeps momentum.
    }
    advance();
  };

  const handleDiscard = () => advance();

  const handleEdit = () => {
    if (!current) return;
    router.push({
      pathname: '/add-item',
      params: {
        imageUri: current.uri,
        fromSession: '1',
        preCategory: current.suggestion?.category ?? '',
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (!uris.length) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#6B7280' }}>{t('bulkImport.empty')}</Text>
      </View>
    );
  }

  const done = cursor >= pending.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={26} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.progress}>
          {t('bulkImport.progress', { done: processedCount, total: pending.length })}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {done ? (
        <View style={styles.doneWrap}>
          <Ionicons name="checkmark-circle" size={48} color="#059669" />
          <Text style={styles.doneTitle}>
            {t('bulkImport.allDone', { saved: savedCount })}
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>
      ) : !currentReady ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={{ color: '#6B7280', marginTop: 12 }}>
            {t('bulkImport.progress', { done: processedCount, total: pending.length })}
          </Text>
        </View>
      ) : (
        <SwipeConfirmStack
          card={buildCard(current)}
          remaining={pending.length - cursor}
          onConfirm={handleConfirm}
          onDiscard={handleDiscard}
          onEdit={handleEdit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progress: { fontSize: 14, fontWeight: '600', color: '#374151' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  doneTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  doneBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#059669',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
