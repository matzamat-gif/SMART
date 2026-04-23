import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { logger, isDevelopment } from './logger';

// Resolve API base URL from (in order):
//   1. process.env.EXPO_PUBLIC_API_URL (build-time, EAS secret)
//   2. expo-constants extra.apiUrl (runtime, app.json or EAS update)
//   3. Local dev fallback (only when running in __DEV__)
//
// We intentionally do NOT ship a production Cloud Run URL hardcoded in
// source (DEV-001). Configure EXPO_PUBLIC_API_URL via EAS secrets instead.
const extra = (Constants?.expoConfig?.extra ?? (Constants as any)?.manifest?.extra ?? {}) as {
  apiUrl?: string;
};

const resolvedUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.API_URL ||
  extra.apiUrl ||
  (isDevelopment ? 'http://localhost:3000/api' : '');

if (!resolvedUrl) {
  throw new Error(
    'API base URL is not configured. Set EXPO_PUBLIC_API_URL via EAS secrets or expo.extra.apiUrl in app.json.'
  );
}

const API_URL = resolvedUrl;

// Validate API_URL format
try {
  const url = new URL(API_URL);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Invalid API_URL protocol: ${url.protocol}. Must be http: or https:`);
  }
} catch (error) {
  logger.error('Invalid API_URL format');
  throw new Error(`Invalid API_URL: ${API_URL}. Must be a valid HTTP/HTTPS URL.`);
}

logger.info('API Base URL configured');

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- JWT helpers (DEV-002, DEV-013) ---------------------------------------

/**
 * Decode a JWT payload without verifying the signature. Used only to read
 * the `exp` claim so we can reject stale tokens client-side before sending
 * a request the server would have to refuse anyway.
 */
function decodeJwtPayload(token: string): { exp?: number; iat?: number; sub?: any } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    // atob is available in Hermes
    const decoded =
      typeof atob === 'function'
        ? atob(padded)
        : // @ts-ignore — Buffer is available via polyfills in RN
          Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isTokenValid(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  // Must look like a JWT (three dot-separated base64url segments)
  if (token.split('.').length !== 3) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (typeof payload.exp === 'number') {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSeconds) return false;
  }
  return true;
}

export async function clearAuthStorage() {
  await AsyncStorage.removeItem('authToken');
  await AsyncStorage.removeItem('user');
}

// Optional global handler that the AuthContext registers so it can route
// the user back to login when the session is invalidated.
let onAuthInvalidated: (() => void) | null = null;
export function setAuthInvalidatedHandler(handler: (() => void) | null) {
  onAuthInvalidated = handler;
}

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    // Drop expired/malformed tokens proactively (DEV-002, DEV-013).
    if (token && !isTokenValid(token)) {
      await clearAuthStorage();
      onAuthInvalidated?.();
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    logger.debug('API request', {
      method: config.method?.toUpperCase(),
      url: config.url,
    });
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    logger.debug('API response', {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  async (error) => {
    // Sanitized error log — never include data, headers, or full URL with
    // query strings (which can carry tokens) in production.
    logger.error('API error', {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
    });
    if (error.response?.status === 401) {
      await clearAuthStorage();
      onAuthInvalidated?.();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { email: string; password: string; username?: string; full_name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getProfile: () =>
    api.get('/auth/profile'),
};

export const wardrobeAPI = {
  analyzeImage: async (formData: FormData) => {
    return api.post('/wardrobe/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      },
    });
  },
  addItem: async (formData: FormData) => {
    // In React Native, do NOT manually set Content-Type for FormData
    // It strips the boundary string, causing the backend to fail parsing
    return api.post('/wardrobe', formData, {
      headers: {
        'Accept': 'application/json',
        // Content-Type is auto-generated by Axios with the boundary
      },
      transformRequest: (data) => data, // crucial for React Native FormData
    });
  },
  getItems: (params?: {
    category?: string;
    season?: string;
    sort_by?: string;
    order?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/wardrobe', { params }),
  getUnusedItems: (days?: number) =>
    api.get('/wardrobe/unused', { params: { days } }),
  updateItem: (id: number, data: any) =>
    api.put(`/wardrobe/${id}`, data),
  deleteItem: (id: number) =>
    api.delete(`/wardrobe/${id}`),
  logWear: (id: number, data: { worn_date?: string; weather?: string; occasion?: string; notes?: string }) =>
    api.post(`/wardrobe/${id}/wear`, data),
  // FLAG: backend endpoint /wardrobe/bulk-tag is not yet implemented.
  // Client falls back to per-image analyzeImage calls when a 404 is
  // returned. Once the endpoint exists it should accept a multipart
  // body with fields image_0, image_1, ... and return
  // { results: [{ index, suggestions, background_removed_url? }, ...] }.
  bulkTag: async (formData: FormData) => {
    return api.post('/wardrobe/bulk-tag', formData, {
      headers: { Accept: 'application/json' },
      transformRequest: (data) => data,
    });
  },
};

export const outfitAPI = {
  generateAI: (data: { occasion?: string; weather?: string; season?: string }) =>
    api.post('/outfits/generate', data),
  getOutfits: (params?: { is_favorite?: boolean }) =>
    api.get('/outfits', { params }),
  createManual: (data: { title?: string; description?: string; occasion?: string; season?: string; item_ids: number[] }) =>
    api.post('/outfits', data),
  toggleFavorite: (id: number) =>
    api.post(`/outfits/${id}/favorite`),
};

// Phase 2 Social Feed API (v1 endpoints)
export const socialFeedAPI = {
  // Profile
  createProfile: (data: { username: string; displayName?: string; bio?: string; visibility?: string; profilePhotoUrl?: string }) =>
    api.post('/social/v1/profile', data),
  getProfile: (username?: string) =>
    username ? api.get(`/social/v1/profile/${username}`) : api.get('/social/v1/profile'),
  updateProfile: (data: { displayName?: string; bio?: string; visibility?: string; profilePhotoUrl?: string }) =>
    api.patch('/social/v1/profile', data),
  deleteProfile: () =>
    api.delete('/social/v1/profile'),
  searchUsers: (query: string, limit?: number) =>
    api.get('/social/v1/search', { params: { q: query, limit } }),

  // Follow
  follow: (targetUserId: number) =>
    api.post('/social/v1/follows', { targetUserId }),
  unfollow: (targetUserId: number) =>
    api.delete(`/social/v1/follows/${targetUserId}`),
  getFollowers: (params?: { userId?: number; cursor?: string; limit?: number }) =>
    api.get('/social/v1/follows/followers', { params }),
  getFollowing: (params?: { userId?: number; cursor?: string; limit?: number }) =>
    api.get('/social/v1/follows/following', { params }),
  // Returns whether the current user follows the given target.
  // Backend may not yet implement this — callers must handle 404 gracefully.
  getFollowStatus: (targetUserId: number) =>
    api.get(`/social/v1/follows/status/${targetUserId}`),

  // Posts
  createPost: (formData: FormData) =>
    api.post('/social/v1/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getPost: (postId: number) =>
    api.get(`/social/v1/posts/${postId}`),
  getUserPosts: (params?: { userId?: number; cursor?: string; limit?: number }) =>
    api.get('/social/v1/posts', { params }),
  updatePost: (postId: number, data: { caption?: string; visibility?: string }) =>
    api.patch(`/social/v1/posts/${postId}`, data),
  deletePost: (postId: number) =>
    api.delete(`/social/v1/posts/${postId}`),

  // Feed
  getFeed: (params?: { cursor?: string; limit?: number }) =>
    api.get('/social/v1/feed', { params }),

  // Engagement
  likePost: (postId: number) =>
    api.post('/social/v1/likes', { postId }),
  unlikePost: (postId: number) =>
    api.delete(`/social/v1/likes/${postId}`),
  savePost: (postId: number) =>
    api.post('/social/v1/saves', { postId }),
  unsavePost: (postId: number) =>
    api.delete(`/social/v1/saves/${postId}`),
  getSavedPosts: (params?: { cursor?: string; limit?: number }) =>
    api.get('/social/v1/saves', { params }),

  // Comments
  addComment: (postId: number, content: string) =>
    api.post(`/social/v1/posts/${postId}/comments`, { content }),
  getComments: (postId: number, params?: { cursor?: string; limit?: number }) =>
    api.get(`/social/v1/posts/${postId}/comments`, { params }),
  deleteComment: (commentId: number) =>
    api.delete(`/social/v1/comments/${commentId}`),

  // Notifications
  getNotifications: (params?: { cursor?: string; limit?: number }) =>
    api.get('/social/v1/notifications', { params }),
  getUnreadNotificationCount: () =>
    api.get('/social/v1/notifications/unread-count'),
  markNotificationsRead: () =>
    api.post('/social/v1/notifications/mark-read'),

  // Push notification token registration (Expo push token).
  // The backend stores it against the authenticated user so morning
  // outfit / re-engagement notifications can be delivered.
  registerPushToken: (data: { token: string; platform: 'ios' | 'android' | 'web' }) =>
    api.post('/notifications/register-token', data),

  // Trust & Safety
  blockUser: (targetUserId: number) =>
    api.post('/social/v1/blocks', { targetUserId }),
  unblockUser: (targetUserId: number) =>
    api.delete(`/social/v1/blocks/${targetUserId}`),
  reportContent: (data: { targetType: 'post' | 'user' | 'comment'; targetId: number; reason: string; details?: string }) =>
    api.post('/social/v1/reports', data),
};

export const socialAPI = {
  createReel: (formData: FormData) =>
    api.post('/social/reels', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getFeed: (params?: { page?: number; limit?: number }) =>
    api.get('/social/feed', { params }),
  likeReel: (id: number) =>
    api.post(`/social/reels/${id}/like`),
  commentOnReel: (id: number, content: string) =>
    api.post(`/social/reels/${id}/comment`, { content }),
  followUser: (userId: number) =>
    api.post(`/social/users/${userId}/follow`),
  getFollowers: (userId?: number) =>
    api.get(`/social/users/${userId || 'me'}/followers`),
  getFollowing: (userId?: number) =>
    api.get(`/social/users/${userId || 'me'}/following`),
};

export const contextAPI = {
  getMoods: () => api.get('/context/moods'),
  getEventTypes: () => api.get('/context/event-types'),
  updateProfile: (data: { city?: string; location_mode?: string; primary_language?: string; preferred_currency?: string; notification_enabled?: boolean; preferred_brands?: string; preferred_colors?: string }) =>
    api.put('/context/profile', data),
  updateConsent: (data: { personalised_ads_enabled?: boolean; contextual_ads_only?: boolean; community_visibility_mode?: string }) =>
    api.put('/context/consent', data),
  getConsent: () => api.get('/context/consent'),
  toggleFavorite: (itemId: number) => api.post(`/context/wardrobe/${itemId}/favorite`),
  toggleLocked: (itemId: number) => api.post(`/context/wardrobe/${itemId}/lock`),
};

export const dailyAPI = {
  generate: (data: { city?: string; destination_city?: string; mood_id?: number; event_type_id?: number; count?: number }) =>
    api.post('/daily/generate', data),
  approve: (outfitId: number) => api.post(`/daily/${outfitId}/approve`),
  swap: (outfitId: number, itemIdToSwap: number) =>
    api.post(`/daily/${outfitId}/swap`, { item_id_to_swap: itemIdToSwap }),
  regenerate: (outfitId: number) => api.post(`/daily/${outfitId}/regenerate`),
  save: (outfitId: number) => api.post(`/daily/${outfitId}/save`),
};

export const insightsAPI = {
  getWardrobe: () => api.get('/insights/wardrobe'),
  getHistory: (params?: { limit?: number; offset?: number }) =>
    api.get('/insights/history', { params }),
};

export const analyticsAPI = {
  trackEvent: (eventType: string, payload?: any) =>
    api.post('/analytics/track', { event_type: eventType, payload }),
};

export default api;
