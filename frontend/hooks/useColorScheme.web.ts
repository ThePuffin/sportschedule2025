import { useSyncExternalStore } from 'react';

const darkQuery = '(prefers-color-scheme: dark)';

function subscribe(callback: () => void) {
  const mediaQueryList = window.matchMedia(darkQuery);
  mediaQueryList.addEventListener('change', callback);
  return () => mediaQueryList.removeEventListener('change', callback);
}

function getSnapshot(): 'light' | 'dark' {
  return window.matchMedia(darkQuery).matches ? 'dark' : 'light';
}

function getServerSnapshot(): 'light' | 'dark' {
  return 'light';
}

/**
 * Returns the browser's color scheme.
 *
 * Uses `useSyncExternalStore` so the REAL theme is returned immediately after
 * hydration on the client — no artificial `'light'` flash before the actual
 * dark/light theme is applied. This prevents the global theme (and accent
 * colors derived from it) from briefly flickering to light on web.
 */
export function useColorScheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
