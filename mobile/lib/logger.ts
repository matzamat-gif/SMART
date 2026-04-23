/**
 * Lightweight logger that strips verbose output in production builds.
 *
 * Rationale: console.log calls were leaking tokens and emails into crash
 * reports (DEV-003). In production we want errors only — never request
 * bodies, headers, or auth tokens.
 */

const isDev = (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.NODE_ENV !== 'production';

export const logger = {
  debug: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  // Errors are always surfaced — but never include tokens, headers, or
  // request bodies. Pass a sanitized message + status only.
  error: (...args: any[]) => {
    console.error(...args);
  },
};

export const isDevelopment = isDev;
