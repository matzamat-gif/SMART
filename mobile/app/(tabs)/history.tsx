import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { insightsAPI } from '../../lib/api';
import { useI18n } from '@/lib/i18n';
import { Alert } from 'react-native';

interface WearLog {
  id: number;
  worn_date: string;
  weather?: string;
  occasion?: string;
  notes?: string;
  category: string;
  sub_category?: string;
  color: string;
  image_url: string;
  brand?: string;
  outfit_id?: number;
}

export default function HistoryScreen() {
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<WearLog[]>([]);
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await insightsAPI.getHistory({ limit: 50 });
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Failed to load history:', error);
      Alert.alert(t('common.error'), t('history.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('history.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('history.yesterday');
    } else {
      const locale = language === 'he' ? 'he-IL' : 'en-US';
      return date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const groupByDate = (logs: WearLog[]) => {
    const groups: { [date: string]: WearLog[] } = {};
    logs.forEach((log) => {
      if (!log.worn_date) return; // Skip if no date
      const date = log.worn_date.split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });
    return groups;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>{t('history.loading')}</Text>
      </View>
    );
  }

  const groupedHistory = groupByDate(history);
  const dates = Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('history.title')}</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'timeline' && styles.viewBtnActive]}
            onPress={() => setViewMode('timeline')}
          >
            <Ionicons
              name="list"
              size={20}
              color={viewMode === 'timeline' ? '#059669' : '#9CA3AF'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'calendar' && styles.viewBtnActive]}
            onPress={() => setViewMode('calendar')}
          >
            <Ionicons
              name="calendar"
              size={20}
              color={viewMode === 'calendar' ? '#059669' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{history.length}</Text>
          <Text style={styles.statLabel}>{t('history.totalWears')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{dates.length}</Text>
          <Text style={styles.statLabel}>{t('history.daysLogged')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {history.filter((h) => h.outfit_id).length}
          </Text>
          <Text style={styles.statLabel}>{t('history.outfits')}</Text>
        </View>
      </View>

      {/* History Timeline */}
      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>{t('history.noHistory')}</Text>
          <Text style={styles.emptyText}>
            {t('history.startApproving')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.timeline}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {dates.map((date) => {
            const logs = groupedHistory[date];
            return (
              <View key={date} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <View style={styles.dateLine} />
                  <Text style={styles.dateText}>{formatDate(date)}</Text>
                  <View style={styles.dateLine} />
                </View>

                {logs.map((log, index) => (
                  <View key={`${log.id}-${index}`} style={styles.logCard}>
                    <Image
                      source={{ uri: log.image_url }}
                      style={styles.logImage}
                      resizeMode="cover"
                    />
                    <View style={styles.logInfo}>
                      <Text style={styles.logCategory}>{log.category}</Text>
                      <Text style={styles.logDetails}>
                        {log.color} {log.sub_category || ''}
                      </Text>
                      {log.brand && (
                        <Text style={styles.logBrand}>{log.brand}</Text>
                      )}
                      <View style={styles.logMeta}>
                        {log.weather && (
                          <View style={styles.metaTag}>
                            <Ionicons name="cloud-outline" size={14} color="#6B7280" />
                            <Text style={styles.metaText}>{log.weather}</Text>
                          </View>
                        )}
                        {log.occasion && (
                          <View style={styles.metaTag}>
                            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                            <Text style={styles.metaText}>{log.occasion}</Text>
                          </View>
                        )}
                      </View>
                      {log.notes && (
                        <Text style={styles.logNotes} numberOfLines={2}>
                          {log.notes}
                        </Text>
                      )}
                    </View>
                    {log.outfit_id && (
                      <View style={styles.outfitBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#059669" />
                        <Text style={styles.outfitBadgeText}>{t('history.outfit')}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  viewBtn: {
    padding: 8,
    borderRadius: 6,
  },
  viewBtnActive: {
    backgroundColor: '#F0FDF4',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  timeline: {
    flex: 1,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginHorizontal: 12,
  },
  logCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logImage: {
    width: 80,
    height: 80,
    backgroundColor: '#E5E7EB',
  },
  logInfo: {
    flex: 1,
    padding: 12,
  },
  logCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  logDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  logBrand: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  logMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  logNotes: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  outfitBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  outfitBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
