import { useCallback } from 'react';
import { analyticsAPI } from '../lib/api';

export type AnalyticsEventType = 
  | 'app_opened'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'registration_completed'
  | 'first_item_added'
  | 'item_added'
  | 'item_tag_confirmed'
  | 'favourite_toggled'
  | 'mood_selected'
  | 'event_type_selected'
  | 'destination_city_selected'
  | 'outfit_generated'
  | 'outfit_viewed'
  | 'outfit_approved'
  | 'outfit_swapped'
  | 'outfit_regenerated'
  | 'outfit_dismissed'
  | 'wear_log_created'
  | 'discover_viewed'
  | 'insights_viewed'
  | 'privacy_choice_selected';

export const useAnalytics = () => {
  const track = useCallback(async (eventType: AnalyticsEventType, payload?: Record<string, any>) => {
    try {
      await analyticsAPI.trackEvent(eventType, payload);
    } catch (error) {
      console.warn(`[Analytics] Failed to track ${eventType}:`, error);
    }
  }, []);

  return { track };
};
