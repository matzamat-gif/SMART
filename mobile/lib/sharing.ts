/**
 * Deep linking + native share helpers (DEV-016).
 *
 * The market analysis ("Bet 2: Social Sharing as a Growth Engine") calls
 * out share-as-acquisition: every shared outfit should drop the recipient
 * onto a page with a clear download CTA. The deep link is the same URL
 * for in-app receipts (mywardrobe://) and web fallbacks (HTTPS landing).
 */

import { Platform, Share } from 'react-native';
import * as Linking from 'expo-linking';

// Web landing page that resolves the deep link and shows a "download to
// view" CTA for non-installed users. Configure this once you have the
// landing page deployed.
export const WEB_LANDING_BASE = 'https://mywardrobe.app/p';

export function getPostShareUrl(postId: number | string): string {
  // Native deep link — handled by expo-linking when the app is installed.
  const native = Linking.createURL(`/social/post/${postId}`);
  return native || `mywardrobe://social/post/${postId}`;
}

export function getPostWebUrl(postId: number | string): string {
  return `${WEB_LANDING_BASE}/${postId}`;
}

export interface SharePostOptions {
  postId: number | string;
  caption?: string;
  authorName?: string;
}

/**
 * Open the native share sheet. The shared message includes both the
 * deep link (for installed users) and the web URL (for everyone else,
 * with a "Find clothes like this" download CTA).
 */
export async function sharePost({ postId, caption, authorName }: SharePostOptions) {
  const webUrl = getPostWebUrl(postId);
  const headline = authorName
    ? `Check out ${authorName}'s outfit on SMART`
    : 'Check out this outfit on SMART';
  const message = [
    caption ? `"${caption}"` : null,
    headline,
    'Find clothes like this →',
    webUrl,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { url: webUrl, message }
        : { message }
    );
  } catch {
    // user cancelled — non-fatal
  }
}
