# File: `frontend/hooks/useFavoriteColor.ts`

## Purpose

The **useFavoriteColor** hook computes the accent color (background + text) based on the user's first favorite team. It prevents color flickering when switching tabs by using a module-level cache.

## Key Features

- **Module-level cache** — computed color persists across component remounts
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
- Falls back to `defaultColor` if no favorites or no team data

### `useFavoriteColor(defaultColor = '#3b82f6')`

The hook itself:

1. Initializes state from module-level `cachedColors` (or computes it)
2. When `firestoreReady` becomes `true`, recomputes from synced cache
3. Listens for `favoritesUpdated` events to update color

## Module-Level Cache

```typescript
let cachedColors: { backgroundColor: string; textColor: string } | null = null;
```

Declared **outside** the hook, shared across all instances. Prevents flash of default color on tab switch.

## Data Flow

1. Component mounts → `useState` reads `cachedColors` (or computes from cache)
2. If `firestoreReady` is `false`, waits for sync
3. When `firestoreReady` becomes `true`, recomputes color from synced cache
4. On `favoritesUpdated` event, recomputes color
5. Returns `{ backgroundColor, textColor }`
