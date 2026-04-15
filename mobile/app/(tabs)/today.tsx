import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { haptics } from '../../lib/haptics';
import { contextAPI, dailyAPI } from '../../lib/api';
import Toast from '../../components/Toast';
import ConfettiAnimation from '../../components/ConfettiAnimation';
import { OutfitCardSkeleton } from '../../components/SkeletonLoader';
import { useToast } from '../../hooks/useToast';
import { useI18n } from '@/lib/i18n';

interface OutfitItem {
  id: number;
  category: string;
  sub_category: string;
  color: string;
  image_url: string;
  brand?: string;
}

interface Outfit {
  id: number;
  items: OutfitItem[];
  score: number;
  reasoning: string[];
}

interface Weather {
  temperature: number;
  condition: string;
  description: string;
  icon: string;
}

interface Mood {
  id: number;
  mood_key: string;
  display_name_en: string;
  display_name_he: string;
}

interface EventType {
  id: number;
  event_key: string;
  display_name_en: string;
  display_name_he: string;
}

export default function TodayScreen() {
  const { t, isRTL, language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedOutfitIndex, setSelectedOutfitIndex] = useState(0);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [destinationCity, setDestinationCity] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast, hideToast, success, error, info } = useToast();
  const isMounted = React.useRef(true);

  useEffect(() => {
    loadInitialData();
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Regenerate outfits when mood or event changes (debounced to avoid race conditions)
  useEffect(() => {
    // Debounce regeneration when context changes
    if (!loading && outfits.length > 0) {
      const timer = setTimeout(() => {
        generateOutfits();
      }, 800); // slightly longer debounce to allow typing city name
      return () => clearTimeout(timer);
    }
  }, [selectedMood, selectedEvent, destinationCity]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load moods and event types
      const [moodsRes, eventsRes] = await Promise.all([
        contextAPI.getMoods(),
        contextAPI.getEventTypes(),
      ]);

      setMoods(moodsRes.data.moods || []);
      setEventTypes(eventsRes.data.event_types || []);

      // Generate daily outfits
      await generateOutfits();
    } catch (err) {
      console.error('Failed to load initial data:', err);
      error(t('today.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const generateOutfits = async (count = 3) => {
    try {
      const response = await dailyAPI.generate({
        mood_id: selectedMood || undefined,
        event_type_id: selectedEvent || undefined,
        destination_city: destinationCity.trim() || undefined,
        count,
      });

      setOutfits(response.data.outfits || []);
      setWeather(response.data.weather);
      setSelectedOutfitIndex(0);
    } catch (err: any) {
      console.error('Failed to generate outfits:', err);
      const message = err.response?.data?.error || t('today.failedToGenerate');
      error(message);
    }
  };

  const handleApprove = async () => {
    if (outfits.length === 0) return;

    try {
      await haptics.success();
      const outfit = outfits[selectedOutfitIndex];
      await dailyAPI.approve(outfit.id);
      
      setShowConfetti(true);
      success(t('today.approvedSuccess'));
      
      setTimeout(() => {
        if (isMounted.current) {
          setShowConfetti(false);
          loadInitialData();
        }
      }, 2000);
    } catch (err) {
      console.error('Failed to approve outfit:', err);
      error(t('today.failedToApprove'));
    }
  };

  const handleSwapItem = async (itemId: number) => {
    try {
      await haptics.medium();
      // Bounds check to prevent crash
      if (selectedOutfitIndex >= outfits.length) {
        error(t('common.error'));
        return;
      }
      const outfit = outfits[selectedOutfitIndex];
      await dailyAPI.swap(outfit.id, itemId);

      info(t('today.swappedSuccess'));
      await generateOutfits();
    } catch (err: any) {
      const message = err.response?.data?.error || t('today.noAlternatives');
      error(message);
    }
  };

  const handleRegenerate = async () => {
    try {
      // Bounds check to prevent crash
      if (selectedOutfitIndex >= outfits.length) {
        error(t('common.error'));
        return;
      }
      const outfit = outfits[selectedOutfitIndex];
      const response = await dailyAPI.regenerate(outfit.id);
      
      // Replace current outfit with new one
      const newOutfit = response.data.outfit;
      const updatedOutfits = [...outfits];
      updatedOutfits[selectedOutfitIndex] = newOutfit;
      setOutfits(updatedOutfits);
      
      await haptics.light();
      info(t('today.regeneratedSuccess'));
    } catch (err) {
      console.error('Failed to regenerate:', err);
      error(t('today.failedToGenerate'));
    }
  };

  const handleSaveForLater = async () => {
    try {
      await haptics.light();
      // Bounds check to prevent crash
      if (selectedOutfitIndex >= outfits.length) {
        error(t('common.error'));
        return;
      }
      const outfit = outfits[selectedOutfitIndex];
      await dailyAPI.save(outfit.id);
      success(t('today.savedSuccess'));
    } catch (err) {
      error(t('today.failedToSave'));
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('today.title')}</Text>
        </View>
        <View style={{ padding: 20 }}>
          <OutfitCardSkeleton />
          <OutfitCardSkeleton />
          <OutfitCardSkeleton />
        </View>
      </ScrollView>
    );
  }

  if (outfits.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="shirt-outline" size={64} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>{t('today.noOutfits')}</Text>
        <Text style={styles.emptyText}>
          {t('today.addMoreItems')}
        </Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/add-item')}
        >
          <Text style={styles.addButtonText}>{t('today.addItemButton')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentOutfit = outfits[selectedOutfitIndex];

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
      <ConfettiAnimation active={showConfetti} />
      <ScrollView style={styles.container}>
      {/* Header with Weather */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('today.title')}</Text>
        {weather && (
          <View style={styles.weatherCard}>
            <Ionicons 
              name={getWeatherIcon(weather.condition)} 
              size={24} 
              color="#059669" 
            />
            <Text style={styles.weatherText}>
              {weather.temperature}°C • {weather.description}
            </Text>
          </View>
        )}
      </View>

      {/* Mood & Event Selectors */}
      <View style={styles.contextContainer}>
        <View style={styles.cityInputContainer}>
          <Ionicons name="location-outline" size={20} color="#6B7280" />
          <TextInput
            style={styles.cityInput}
            placeholder={t('today.destinationCity') || 'Destination City (Optional)'}
            value={destinationCity}
            onChangeText={setDestinationCity}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipGroup}>
            <Text style={styles.chipLabel}>{t('today.mood')}</Text>
            {moods.slice(0, 4).map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.chip,
                  selectedMood === mood.id && styles.chipSelected,
                ]}
                onPress={() => {
                  const newMoodId = selectedMood === mood.id ? null : mood.id;
                  setSelectedMood(newMoodId);
                  // Debounced regeneration happens via useEffect
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedMood === mood.id && styles.chipTextSelected,
                  ]}
                >
                  {language === 'he' ? mood.display_name_he : mood.display_name_en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipGroup}>
            <Text style={styles.chipLabel}>{t('today.event')}</Text>
            {eventTypes.slice(0, 4).map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.chip,
                  selectedEvent === event.id && styles.chipSelected,
                ]}
                onPress={() => {
                  const newEventId = selectedEvent === event.id ? null : event.id;
                  setSelectedEvent(newEventId);
                  // Debounced regeneration happens via useEffect
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedEvent === event.id && styles.chipTextSelected,
                  ]}
                >
                  {language === 'he' ? event.display_name_he : event.display_name_en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Outfit Selector */}
      <View style={styles.outfitSelector}>
        {outfits.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.outfitDot,
              index === selectedOutfitIndex && styles.outfitDotActive,
            ]}
            onPress={() => setSelectedOutfitIndex(index)}
          />
        ))}
      </View>

      {/* Current Outfit Display */}
      <View style={styles.outfitCard}>
        <View style={styles.itemsContainer}>
          {currentOutfit.items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemCard}
              onPress={async () => {
                await haptics.light();
                handleSwapItem(item.id);
              }}
            >
              <Image
                source={{ uri: item.image_url }}
                style={styles.itemImage}
                resizeMode="cover"
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemCategory}>{item.category}</Text>
                <Text style={styles.itemDetails}>
                  {item.color} {item.sub_category || ''}
                </Text>
              </View>
              <Ionicons name="swap-horizontal" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Reasoning */}
        {currentOutfit.reasoning && currentOutfit.reasoning.length > 0 && (
          <View style={styles.reasoningCard}>
            <Text style={styles.reasoningTitle}>{t('today.whyThisWorks')}</Text>
            {currentOutfit.reasoning.map((reason, index) => (
              <Text key={index} style={styles.reasoningText}>
                • {reason}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleRegenerate}
        >
          <Ionicons name="refresh" size={20} color="#059669" />
          <Text style={styles.secondaryButtonText}>{t('today.regenerate')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSaveForLater}
        >
          <Ionicons name="bookmark-outline" size={20} color="#059669" />
          <Text style={styles.secondaryButtonText}>{t('today.save')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleApprove}>
        <LinearGradient
          colors={['#059669', '#10B981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.approveButton}
        >
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.approveButtonText}>{t('today.approveWear')}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
    </>
  );
}

function getWeatherIcon(condition: string): any {
  const icons: { [key: string]: any } = {
    Clear: 'sunny',
    Clouds: 'cloudy',
    Rain: 'rainy',
    Snow: 'snow',
    Thunderstorm: 'thunderstorm',
  };
  return icons[condition] || 'partly-sunny';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  addButton: {
    marginTop: 24,
    backgroundColor: '#059669',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  weatherText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  contextContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  cityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 44,
  },
  cityInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1F2937',
    height: '100%',
  },
  chipGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  outfitSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  outfitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  outfitDotActive: {
    backgroundColor: '#059669',
    width: 24,
  },
  outfitCard: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemsContainer: {
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  reasoningCard: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  reasoningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 13,
    color: '#1E40AF',
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  approveButton: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  approveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
