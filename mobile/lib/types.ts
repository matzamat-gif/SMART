export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  profile_image_url?: string;
  bio?: string;
  is_private: boolean;
}

export interface WardrobeItem {
  id: number;
  user_id: number;
  category: string;
  sub_category?: string;
  brand?: string;
  color?: string;
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'all';
  image_url: string;
  ai_tags?: any;
  notes?: string;
  purchase_date?: string;
  price?: number;
  times_worn: number;
  last_worn_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Outfit {
  id: number;
  user_id: number;
  title?: string;
  description?: string;
  occasion?: string;
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'all';
  weather?: string;
  ai_generated: boolean;
  ai_score?: number;
  is_favorite: boolean;
  image_url?: string;
  times_worn: number;
  last_worn_date?: string;
  created_at: string;
  items?: WardrobeItem[];
}

export interface Reel {
  id: number;
  user_id: number;
  outfit_id?: number;
  caption?: string;
  video_url?: string;
  thumbnail_url?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  is_public: boolean;
  created_at: string;
  username?: string;
  profile_image_url?: string;
  full_name?: string;
  is_liked?: boolean;
}

// Phase 2 Social Feed Types
export type VisibilityMode = 'private' | 'followers_only' | 'public';
export type PostSourceType = 'approved_outfit' | 'manual_outfit' | 'saved_look';

export interface SocialProfile {
  id: number;
  user_id: number;
  username: string;
  display_name?: string;
  profile_photo_url?: string;
  bio?: string;
  visibility_mode: VisibilityMode;
  style_tags_json?: any;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
  updated_at: string;
  // Optional — set by the backend when the request is authenticated.
  // When present, callers should trust this over a separate status fetch.
  is_following?: boolean;
}

export interface FeedPost {
  id: number;
  user_id: number;
  outfit_id?: number;
  image_url: string;
  caption?: string;
  source_type: PostSourceType;
  visibility_mode: VisibilityMode;
  status: 'active' | 'archived' | 'deleted';
  likes_count: number;
  saves_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  // Enriched fields from API
  username?: string;
  display_name?: string;
  profile_photo_url?: string;
  liked?: boolean;
  saved?: boolean;
}

export interface FeedComment {
  id: number;
  user_id: number;
  post_id: number;
  content: string;
  status: 'active' | 'hidden' | 'deleted';
  created_at: string;
  updated_at: string;
  // Joined from social_profiles
  username?: string;
  display_name?: string;
  profile_photo_url?: string;
}

export interface SocialNotification {
  id: number;
  user_id: number;
  actor_id: number;
  type: 'like' | 'comment' | 'follow';
  reference_id: number | null;
  is_read: boolean;
  created_at: string;
  // Joined fields
  actor_username: string;
  actor_display_name?: string;
  actor_avatar?: string;
  post_image?: string;
  comment_content?: string;
}

export interface SocialUser {
  id: number;
  username: string;
  full_name?: string;
  profile_image_url?: string;
  social_username?: string;
  social_display_name?: string;
  followed_at?: string;
}

export const CATEGORIES = [
  'Shirts',
  'Pants',
  'Dresses',
  'Skirts',
  'Jackets',
  'Sweaters',
  'Shoes',
  'Accessories',
  'Bags',
  'Other',
] as const;

export const SEASONS = [
  { label: 'All', value: 'all' },
  { label: 'Spring', value: 'spring' },
  { label: 'Summer', value: 'summer' },
  { label: 'Fall', value: 'fall' },
  { label: 'Winter', value: 'winter' },
] as const;
