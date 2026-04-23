import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useI18n } from '../lib/i18n';
import { haptics } from '../lib/haptics';
import { useScanSession } from '../context/ScanSessionContext';

// Thresholds for the "first outfit ready" celebration.
const READY_ITEM_COUNT = 8;
const READY_CATEGORY_COUNT = 3;

export default function ScanSession() {
  const { t } = useI18n();
  const session = useScanSession();
  const params = useLocalSearchParams<{ preCategory?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [taking, setTaking] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!session) return;
    if (!session.isActive) session.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itemCount = session?.items.length ?? 0;
  const categoryCount = session ? Object.keys(session.categoryCounts).length : 0;

  // Fire the "first outfit ready" toast once when thresholds are met.
  useEffect(() => {
    if (!showCelebration && itemCount >= READY_ITEM_COUNT && categoryCount >= READY_CATEGORY_COUNT) {
      setShowCelebration(true);
      Animated.sequence([
        Animated.timing(celebrationOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      haptics.success();
    }
  }, [itemCount, categoryCount, showCelebration, celebrationOpacity]);

  const handleShoot = async () => {
    if (!cameraRef.current || taking) return;
    setTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        await haptics.medium();
        router.push({
          pathname: '/add-item',
          params: {
            imageUri: photo.uri,
            fromSession: '1',
            preCategory: params.preCategory ?? '',
          },
        });
      }
    } catch (e) {
      console.error('Scan session capture failed:', e);
    } finally {
      setTaking(false);
    }
  };

  const handleImport = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 20,
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.length) return;
    router.push({
      pathname: '/bulk-import',
      params: { uris: res.assets.map((a) => a.uri).join('|') },
    });
  };

  const handleDone = () => {
    session?.end();
    router.back();
  };

  const openCelebration = () => {
    session?.end();
    router.replace('/(tabs)/today');
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#6B7280" />
        <Text style={styles.permissionText}>{t('addItem.cameraPermissionRequired')}</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>
            {t('scan.grantAccess') || 'Grant Permission'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDone}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef}>
        <SafeAreaView style={styles.overlay}>
          {/* Top: session strip + Done */}
          <View style={styles.topBar}>
            <View style={styles.strip}>
              {itemCount === 0 ? (
                <Text style={styles.stripEmpty}>
                  {params.preCategory
                    ? t('scanSession.stripEmptyCategory', {
                        category: t(`addItem.categories.${params.preCategory}`),
                      })
                    : t('scanSession.stripEmpty')}
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {session!.items.slice(-5).map((item) => (
                    <View key={item.id} style={styles.thumbWrap}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.thumb} />
                      ) : (
                        <View style={[styles.thumb, styles.thumbPlaceholder]}>
                          <Ionicons name="shirt-outline" size={18} color="#fff" />
                        </View>
                      )}
                    </View>
                  ))}
                  <View style={styles.counterChip}>
                    <Text style={styles.counterChipText}>
                      {t('scanSession.counter', {
                        total: itemCount,
                        summary: formatCategorySummary(session!.categoryCounts, t),
                      })}
                    </Text>
                  </View>
                </ScrollView>
              )}
            </View>
            <TouchableOpacity onPress={handleDone} style={styles.doneBtn}>
              <Text style={styles.doneText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom: shoot + import */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.sideBtn} onPress={handleImport}>
              <Ionicons name="images" size={26} color="#fff" />
              <Text style={styles.sideBtnLabel}>{t('scanSession.import')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleShoot}
              disabled={taking}
              accessibilityLabel={t('scanSession.shoot')}
            >
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <View style={styles.sideBtn} />
          </View>

          {showCelebration ? (
            <Animated.View style={[styles.celebration, { opacity: celebrationOpacity }]}>
              <TouchableOpacity onPress={openCelebration} style={styles.celebrationInner}>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.celebrationText}>{t('scanSession.firstOutfitReady')}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          ) : null}
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

function formatCategorySummary(
  counts: Record<string, number>,
  t: (k: string, p?: Record<string, any>) => string
): string {
  return Object.entries(counts)
    .map(([k, v]) => `${t(`addItem.categories.${k}`)} ${v}`)
    .join(' · ');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  strip: {
    flex: 1,
    minHeight: 56,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  stripEmpty: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    textAlign: 'center',
  },
  thumbWrap: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B5563',
  },
  counterChip: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
  },
  counterChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  doneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  doneText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  sideBtn: {
    width: 64,
    alignItems: 'center',
    gap: 4,
  },
  sideBtnLabel: { color: '#fff', fontSize: 12, fontWeight: '500' },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  celebration: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    right: 20,
  },
  celebrationInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#059669',
  },
  celebrationText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  permissionText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelText: { color: '#6B7280', fontSize: 15 },
});
