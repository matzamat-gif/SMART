import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { wardrobeAPI } from '../lib/api';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { haptics } from '../lib/haptics';
import LoadingButton from '../components/LoadingButton';
import { useI18n } from '../lib/i18n';
import CameraModal from '../components/CameraModal';
import { useAnalytics } from '../hooks/useAnalytics';
import ItemChipRow, { ChipOption } from '../components/ItemChipRow';
import { useScanSession } from '../context/ScanSessionContext';

// Warmth → season mapping (backend expects season).
// FLAG: warmth is a UX-facing concept; this mapping is a compromise
// until the backend exposes a dedicated warmth field.
const WARMTH_TO_SEASON: Record<string, string> = {
  hot: 'summer',
  warm: 'summer',
  mild: 'fall',
  cold: 'winter',
  any: 'all',
};

const CATEGORY_KEYS = ['tops', 'bottoms', 'shoes', 'outerwear', 'accessories'] as const;
const COLOR_KEYS = ['black', 'white', 'gray', 'blue', 'red', 'green', 'beige', 'brown'] as const;
const WARMTH_KEYS = ['hot', 'warm', 'mild', 'cold', 'any'] as const;

type Suggestion = {
  category?: string;
  sub_category?: string;
  color?: string;
  season?: string;
  brand?: string;
  material?: string;
};

export default function AddItemScreen() {
  const { t } = useI18n();
  const { track } = useAnalytics();
  const params = useLocalSearchParams<{
    imageUri?: string;
    preCategory?: string;
    fromSession?: string;
  }>();
  const scanSession = useScanSession();

  const [image, setImage] = useState<string | null>(params.imageUri ?? null);
  const [showCamera, setShowCamera] = useState(false);
  const [category, setCategory] = useState<string | null>(params.preCategory ?? null);
  const [color, setColor] = useState<string | null>(null);
  const [warmth, setWarmth] = useState<string | null>(null);
  const [subCategory, setSubCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [material, setMaterial] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast, success, error, hideToast } = useToast();

  // Reset submitting state on mount to prevent stuck button
  useEffect(() => {
    setSubmitting(false);
  }, []);

  // If we arrived with an image already (from scan session), analyze it.
  useEffect(() => {
    if (params.imageUri && !category && !color && !isAnalyzing) {
      handleImageAnalysis(params.imageUri);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.imageUri]);

  const categoryOptions: ChipOption[] = useMemo(
    () => CATEGORY_KEYS.map((k) => ({ key: k, label: t(`addItem.categories.${k}`) })),
    [t]
  );
  const colorOptions: ChipOption[] = useMemo(
    () => COLOR_KEYS.map((k) => ({ key: k, label: t(`addItem.colors.${k}`) })),
    [t]
  );
  const warmthOptions: ChipOption[] = useMemo(
    () => WARMTH_KEYS.map((k) => ({ key: k, label: t(`addItem.warmth.${k}`) })),
    [t]
  );

  const applySuggestion = (s: Suggestion) => {
    // "User confirms, AI suggests" — pre-select top pick but do not save
    // until the user taps Save.
    if (s.category) {
      const matched = CATEGORY_KEYS.find(
        (c) => c === s.category!.toLowerCase() || s.category!.toLowerCase().includes(c)
      );
      if (matched) setCategory(matched);
    }
    if (s.color) {
      const lc = s.color.toLowerCase();
      const matched = COLOR_KEYS.find((c) => c === lc || lc.includes(c) || c.includes(lc));
      if (matched) setColor(matched);
    }
    if (s.season) {
      const lc = s.season.toLowerCase();
      const mapped = Object.entries(WARMTH_TO_SEASON).find(([, v]) => v === lc)?.[0];
      if (mapped) setWarmth(mapped);
      else if (lc === 'all') setWarmth('any');
    }
    if (s.sub_category) setSubCategory(s.sub_category);
    if (s.brand) setBrand(s.brand);
    if (s.material) setMaterial(s.material);
  };

  const handleImageAnalysis = async (uri: string) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('image', { uri, name: filename, type } as any);

      const response = await wardrobeAPI.analyzeImage(formData);
      const suggestions: Suggestion | undefined = response.data?.suggestions;
      const bgRemovedUri: string | undefined = response.data?.background_removed_url;
      if (bgRemovedUri) {
        setImage(bgRemovedUri);
        setBgRemoved(true);
      }
      if (suggestions) {
        applySuggestion(suggestions);
        await haptics.success();
      }
      // FLAG: backend does not yet return per-field confidence scores.
      // When it does, fields with confidence < 0.7 should be left
      // unselected (forceChoice on ItemChipRow).
    } catch (err: any) {
      console.error('Image analysis failed:', err?.response?.data || err?.message);
      // Silent — user can pick chips manually.
    } finally {
      setIsAnalyzing(false);
    }
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('common.error'), t('addItem.photoPermissionRequired'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
      });
      if (!result.canceled && result.assets?.[0]) {
        const uri = result.assets[0].uri;
        setImage(uri);
        setBgRemoved(false);
        await haptics.success();
        await handleImageAnalysis(uri);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('errors.unknownError');
      Alert.alert(t('common.error'), `${t('errors.galleryError')}: ${msg}`);
    }
  };

  const handlePictureTaken = async (uri: string) => {
    setImage(uri);
    setShowCamera(false);
    setBgRemoved(false);
    await haptics.success();
    await handleImageAnalysis(uri);
  };

  const saveButtonLabel = useMemo(() => {
    if (submitting) return t('addItem.saving');
    if (!category || !color) return t('addItem.saveButton');
    // Dynamic copy: "Save — it's a black t-shirt"
    const colorLabel = t(`addItem.colors.${color}`);
    const catLabel = t(`addItem.categories.${category}`);
    return t('addItem.saveDynamic', { color: colorLabel, category: catLabel });
  }, [submitting, category, color, t]);

  const handleSubmit = async () => {
    if (!image) {
      error(t('addItem.photoRequired'));
      return;
    }
    if (!category) {
      error(t('addItem.selectCategoryError'));
      return;
    }
    if (!color) {
      error(t('addItem.selectColorError'));
      return;
    }

    try {
      setSubmitting(true);
      await haptics.medium();

      const formData = new FormData();
      const filename = image.split('/').pop() || 'photo.jpg';
      const mt = /\.(\w+)$/.exec(filename);
      const type = mt ? `image/${mt[1]}` : 'image/jpeg';
      formData.append('image', { uri: image, name: filename, type } as any);
      formData.append('category', category);
      if (subCategory) formData.append('sub_category', subCategory);
      formData.append('color', color);
      formData.append('season', WARMTH_TO_SEASON[warmth ?? 'any']);
      if (brand) formData.append('brand', brand);
      if (material) formData.append('material', material);
      formData.append(
        'ai_tags',
        JSON.stringify({ category, color, warmth: warmth ?? 'any' })
      );

      const res = await wardrobeAPI.addItem(formData);
      const saved = res?.data?.item ?? res?.data;

      await track('item_added', { category, color, warmth, from_session: !!params.fromSession });
      await haptics.success();

      if (params.fromSession && scanSession && saved) {
        scanSession.addItem({
          id: saved.id,
          category,
          color,
          image_url: saved.image_url ?? image,
        });
        // Return to the scan session to shoot the next item.
        router.back();
        return;
      }

      success(t('addItem.itemAdded'));
      setTimeout(() => router.back(), 800);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || t('errors.unknownError');
      Alert.alert(t('common.error'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  const sessionCount = params.fromSession && scanSession ? scanSession.items.length + 1 : null;

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      <CameraModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onPictureTaken={handlePictureTaken}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {sessionCount
            ? t('addItem.sessionCounter', { n: sessionCount })
            : t('addItem.title')}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentPad}
        showsVerticalScrollIndicator={false}
      >
        {image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
            {bgRemoved ? (
              <View style={styles.bgBadge}>
                <Ionicons name="cut-outline" size={12} color="#fff" />
                <Text style={styles.bgBadgeText}>{t('addItem.bgRemoved')}</Text>
              </View>
            ) : null}
            {isAnalyzing ? (
              <View style={styles.analyzingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.analyzingText}>{t('addItem.analyzing')}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={48} color="#9CA3AF" />
            <View style={styles.imageButtons}>
              <TouchableOpacity style={styles.imageButton} onPress={() => setShowCamera(true)}>
                <Ionicons name="camera" size={20} color="#059669" />
                <Text style={styles.imageButtonText}>{t('addItem.camera')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Ionicons name="images" size={20} color="#059669" />
                <Text style={styles.imageButtonText}>{t('addItem.gallery')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />

        <ItemChipRow
          title={t('addItem.categoryRequired')}
          options={categoryOptions}
          value={category}
          onChange={setCategory}
        />
        <ItemChipRow
          title={t('addItem.colorRequired')}
          options={colorOptions}
          value={color}
          onChange={setColor}
        />
        <ItemChipRow
          title={t('addItem.warmthLabel')}
          options={warmthOptions}
          value={warmth}
          onChange={setWarmth}
        />

        <TouchableOpacity
          onPress={() => setShowDetails((v) => !v)}
          style={styles.detailsToggle}
          hitSlop={6}
        >
          <Ionicons
            name={showDetails ? 'remove-circle-outline' : 'add-circle-outline'}
            size={18}
            color="#059669"
          />
          <Text style={styles.detailsToggleText}>{t('addItem.addDetails')}</Text>
        </TouchableOpacity>

        {showDetails ? (
          <View style={styles.detailsBlock}>
            <Text style={styles.detailLabel}>{t('addItem.subCategoryLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('addItem.subCategoryPlaceholder')}
              value={subCategory}
              onChangeText={setSubCategory}
            />
            <Text style={styles.detailLabel}>{t('addItem.brandLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('addItem.brandPlaceholder')}
              value={brand}
              onChangeText={setBrand}
            />
            <Text style={styles.detailLabel}>{t('addItem.materialLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('addItem.materialPlaceholder')}
              value={material}
              onChangeText={setMaterial}
            />
          </View>
        ) : null}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.footer}>
        <LoadingButton
          title={saveButtonLabel}
          loading={submitting}
          loadingText={t('addItem.saving')}
          icon="checkmark"
          variant="gradient"
          onPress={handleSubmit}
          style={styles.submitButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#1F2937' },
  content: { flex: 1 },
  contentPad: { paddingHorizontal: 20, paddingTop: 16 },
  imageContainer: { position: 'relative' },
  image: {
    width: '100%',
    height: 280,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  bgBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(5,150,105,0.9)',
  },
  bgBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingText: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 10 },
  imagePlaceholder: {
    height: 220,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    gap: 16,
  },
  imageButtons: { flexDirection: 'row', gap: 24 },
  imageButton: { alignItems: 'center', gap: 4 },
  imageButtonText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  detailsToggleText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  detailsBlock: { marginTop: 8 },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#fff',
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  submitButton: { width: '100%', minHeight: 56 },
});
