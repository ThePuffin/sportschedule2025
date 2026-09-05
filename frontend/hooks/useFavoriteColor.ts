import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getCache } from '@/utils/fetchData';
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'favoriteColor';

function getBrightness(color: string) {
  if (!color) return 0;
  let hex = color.replace(/#/g, '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function getTextColorForBackground(bgColor: string) {
  const brightness = getBrightness(bgColor);
  return brightness > 128 ? '#000000' : '#FFFFFF';
}

function computeFavoriteColor(
  theme: 'light' | 'dark',
  defaultColor: string,
): { backgroundColor: string; textColor: string } {
  const favoriteTeams = getCache<string[]>('favoriteTeams');
  if (favoriteTeams && favoriteTeams.length > 0) {
    const firstFav = favoriteTeams[0];
    const teamData = (Colors as any)[firstFav];

    if (teamData) {
      const { color, backgroundColor: teamBg } = teamData;
      const b1 = getBrightness(color);
      const b2 = getBrightness(teamBg);

      let finalColor;
      if (theme === 'light') {
        // Darkest
        finalColor = b1 < b2 ? color : teamBg;
      } else {
        // Lightest
        finalColor = b1 > b2 ? color : teamBg;
      }

      // Some teams only define `color` (no `backgroundColor`). In that case
      // `teamBg` is undefined and `finalColor` would fall back to the default
      // color (e.g. black). Prefer the team's own `color` before the default.
      finalColor = finalColor || color || defaultColor;
      return { backgroundColor: finalColor, textColor: getTextColorForBackground(finalColor) };
    }
  }
  return { backgroundColor: defaultColor, textColor: getTextColorForBackground(defaultColor) };
}

type FavoriteColors = { backgroundColor: string; textColor: string };

// Module-level cache: computed once, reused across all hook instances and tab remounts.
// This prevents a flash of default color when switching tabs.
let cachedColors: FavoriteColors | null = null;

// Web SSR hydration quirk: `useColorScheme()` returns the server snapshot
// ('light') during the first client render, before `useSyncExternalStore`
// synchronizes with the real browser theme. For the INITIAL computation we
// read the browser's actual theme directly so we never compute with 'light'
// when the browser is actually dark (which caused a red -> black flash on web).
function getBrowserTheme(): 'light' | 'dark' {
  if (globalThis.window !== undefined && globalThis.window.matchMedia) {
    return globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function readStoredColors(): FavoriteColors | null {
  if (globalThis.window === undefined) return null;
  try {
    const raw = globalThis.window.sessionStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FavoriteColors;
    if (parsed?.backgroundColor && parsed?.textColor) {
      return parsed;
    }
  } catch {
    // Ignore corrupted or unavailable storage.
  }
  return null;
}

function writeStoredColors(colors: FavoriteColors) {
  if (globalThis.window === undefined) return;
  try {
    globalThis.window.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // Storage may be unavailable (private mode, etc.).
  }
}

export function useFavoriteColor(defaultColor: string = '#3b82f6') {
  const { firestoreReady } = useAuth();
  const theme = useColorScheme() ?? 'light';

  // Initial value, returned immediately:
  // 1. sessionStorage first — no computation needed, avoids any flash.
  //    Also sync the module-level cache so all hook instances share the
  //    same value before the async recompute happens.
  // 2. Module-level cache shared across hook instances.
  // 3. Fallback: compute synchronously and persist it for next time.
  const [colors, setColors] = useState(() => {
    const stored = readStoredColors();
    if (stored) {
      cachedColors = stored;
      return stored;
    }
    if (cachedColors) {
      return cachedColors;
    }
    // Use the real browser theme for the initial computation so the first
    // paint can never be computed with the SSR 'light' snapshot on web.
    const initialTheme = getBrowserTheme();
    cachedColors = computeFavoriteColor(initialTheme, defaultColor);
    writeStoredColors(cachedColors);
    return cachedColors;
  });

  // Recompute the color and persist it to sessionStorage WITHOUT notifying the
  // front (no setColors). Used by the background async refresh so the session
  // stays up to date for future mounts without triggering a re-render.
  const recomputeAndStore = useCallback(() => {
    cachedColors = computeFavoriteColor(theme, defaultColor);
    writeStoredColors(cachedColors);
    return cachedColors;
  }, [theme, defaultColor]);

  // Recompute, persist, and update the displayed color (theme change, firestore
  // sync, favoritesUpdated event).
  const updateColor = useCallback(() => {
    setColors(recomputeAndStore());
  }, [recomputeAndStore]);

  // Recompute asynchronously 2 seconds after every mount (or theme change).
  // The stored session value is returned immediately, then refreshed in the
  // background. Only the session is updated — the displayed color is not
  // re-rendered.
  useEffect(() => {
    const timeout = setTimeout(() => {
      recomputeAndStore();
    }, 2000);
    return () => clearTimeout(timeout);
  }, [recomputeAndStore]);

  // Recompute immediately when the theme changes (dark <-> light), instead of
  // waiting for the 2s async refresh, so the accent color updates right away.
  // On web, `useColorScheme` returns 'light' before hydration then the real
  // theme afterwards. We ignore that first transition (prevTheme === null) so
  // it doesn't trigger a spurious recompute (which caused a red -> black ->
  // red flicker).
  const prevTheme = useRef<string | null>(null);
  useEffect(() => {
    if (prevTheme.current === null) {
      // First render / hydration — record the theme without recomputing.
      prevTheme.current = theme;
      return;
    }
    if (prevTheme.current !== theme) {
      prevTheme.current = theme;
      updateColor();
    }
  }, [theme, updateColor]);

  // When firestoreReady becomes true, recompute the color from the now-synced cache.
  useEffect(() => {
    if (firestoreReady) {
      updateColor();
    }
  }, [firestoreReady, updateColor]);

  useEffect(() => {
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('favoritesUpdated', updateColor);
      return () => globalThis.window.removeEventListener('favoritesUpdated', updateColor);
    }
  }, [updateColor]);

  return { backgroundColor: colors.backgroundColor, textColor: colors.textColor };
}
