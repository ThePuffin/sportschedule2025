# File: `frontend/hooks/useFavoriteColor.ts`

## Purpose

The **useFavoriteColor** hook computes the accent color (background + text) based on the user's first favorite team. It returns the color **immediately** from `sessionStorage` (no computation, no flash), then recomputes it **asynchronously 2 seconds** after each mount to keep the value up to date.

## Key Features

- **Instant return** — the value stored in `sessionStorage` is returned synchronously on first render
- **Async refresh (session only)** — the color is recomputed in the background 2 seconds after each mount and persisted to `sessionStorage`, **without** updating the displayed color (no re-render)
- **Immediate theme refresh** — the color is recomputed right away when the theme changes (dark ↔ light), without waiting for the 2s async refresh
- **Module-level cache** — computed color also persists across component remounts
- **Theme-aware** — picks darkest color in light mode, lightest in dark mode
- **Firestore-ready** — waits for `firestoreReady` before final color computation
- **Event-driven** — updates on `favoritesUpdated` events
- **Contrast-aware text** — computes readable text color (black/white) based on background brightness

## Key Functions

### `getBrightness(color)`

Computes the perceived brightness of a hex color using the formula:

```
(r * 299 + g * 587 + b * 114) / 1000
```

### `getTextColorForBackground(bgColor)`

Returns `#000000` if background is bright (> 128), otherwise `#FFFFFF`.

### `computeFavoriteColor(theme, defaultColor)`

Computes the accent color from the first favorite team:

- Reads `favoriteTeams` from cache
- Gets team color data from `Colors` constant
- In **light mode**: picks the darkest of `color` / `backgroundColor`
- In **dark mode**: picks the lightest
- Falls back to the team's own `color` before `defaultColor` (robustness safety net if `backgroundColor` is ever missing)
- Falls back to `defaultColor` if no favorites or no team data

### `getBrowserTheme()`

Reads the browser's **actual** theme synchronously via `window.matchMedia('(prefers-color-scheme: dark)')`. Falls back to `'light'` when `matchMedia` is unavailable. Used for the initial computation to avoid the SSR `'light'` snapshot on web.

### `readStoredColors()`

Reads and parses `{ backgroundColor, textColor }` from `sessionStorage` under the key `favoriteColor`. Returns `null` if storage is unavailable, the value is missing, or JSON is corrupted.

### `writeStoredColors(colors)`

Serializes and writes the colors to `sessionStorage` under the key `favoriteColor`. Silently ignores errors (private mode, quota, etc.).

### `useFavoriteColor(defaultColor = '#3b82f6')`

The hook itself:

1. Reads `sessionStorage` → returns the stored value **immediately** (no computation) and syncs it into the module-level `cachedColors` so all hook instances share the same value before the async recompute
2. Falls back to the module-level `cachedColors` if storage is empty
3. Falls back to a synchronous computation persisted to storage (uses `getBrowserTheme()` to read the real browser theme, avoiding the SSR `'light'` snapshot on web)
4. 2 seconds after mount, recomputes the color asynchronously and stores it in `sessionStorage` **without** updating the displayed color
5. When the theme changes (dark ↔ light), recomputes the color **immediately** and updates the display (the first render/hydration transition is ignored to avoid a spurious recompute on web)
6. When `firestoreReady` becomes `true`, recomputes from synced cache and updates the display
7. Listens for `favoritesUpdated` events to update color

## Storage & Cache

### sessionStorage key

```typescript
const STORAGE_KEY = 'favoriteColor';
```

Value shape: `{ "backgroundColor": "#...", "textColor": "#..." }`

### Module-level cache

```typescript
let cachedColors: { backgroundColor: string; textColor: string } | null = null;
```

Declared **outside** the hook, shared across all instances. Prevents flash of default color on tab switch when `sessionStorage` is unavailable.

## Data Flow

1. Component mounts → `useState` reads `sessionStorage` → returns stored value **immediately** and syncs it into `cachedColors`
2. If storage is empty → falls back to `cachedColors`, else computes synchronously and persists
3. A `setTimeout(2000)` fires → recomputes color and updates `sessionStorage` only (no `setColors`, no re-render)
4. On theme change (dark ↔ light) → recomputes color **immediately** and updates the display (no 2s wait; first hydration transition ignored)
5. If `firestoreReady` is `false`, waits for sync, then recomputes and updates the display
6. On `favoritesUpdated` event, recomputes color and updates the display
7. Returns `{ backgroundColor, textColor }`
