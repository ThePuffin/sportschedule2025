# Architecture & Recent Changes

> **📚 Per-file documentation:** For detailed AI-readable documentation of each file, see the [`frontend/docs/`](./docs/) directory. Each file has a corresponding `.md` file explaining its purpose, features, state, functions, and data flow.

---

## Change: Invert bottom logo and date/time position in stacked (vertical) game cards

### Overview

In narrow/restricted width configurations the card (`CardLarge`) stacks its content vertically (`verticalMode`, `flexDirection: 'column'`). The vertical layout originally was **away team -> center (`@`/score + date/time) -> home team**. The date/time block is now moved to the very bottom, while the score/`@` indicator stays between the two logos.

### Resulting order (vertical mode)

1. Away team (order 1)
2. `@` / score (order 2) — centerScoreVs
3. Home team (order 3)
4. Date/time (order 4) — centerTime

### Implementation

Modified file: `frontend/components/CardLarge.tsx`

- Split the former single `centerContent` into two variables:
  - `centerScoreVs` — the score / `@` / reveal block
  - `centerTime` — the date/time container
- In `mainRow`, when `verticalMode` is enabled, applied CSS `order` to reorder the columns:
  - Away team column: `order: 1`
  - Center column (`centerScoreVs`): `order: 2`
  - Home team column: `order: 3`
  - `centerTime` appended at the end: `order: 4`
- In horizontal (non-vertical) mode the center column renders both `centerScoreVs` and `centerTime` as before; the `@` and date/time stay together in the middle column.
- Equal vertical spacing in vertical mode: the `centerTime` block uses `marginTop: 20` / `marginBottom: 0` so the gap below the bottom (home) logo equals the gap above the footer separator (`mainRow` bottom padding `10` + `footer` top margin `10`)

### Behavior

| `verticalMode` | Order shown in card                       |
| -------------- | ----------------------------------------- |
| `false`        | Left to right: away / center / home       |
| `true`         | Top to bottom: away / `@` / home / time   |

### Modified files

| File                                       | Change                                      |
| ------------------------------------------ | ------------------------------------------- |
| `frontend/components/CardLarge.tsx`         | Reordered stacked rows via CSS `order`      |
| `frontend/docs/components/CardLarge.tsx.md` | Documented the new vertical stacked ordering |

---

## Feature: Swipe gesture to cycle home/away filter on Calendar

### Overview

Added a horizontal swipe gesture to the **Calendar** tab that lets users cycle through the home / all / away game filters without tapping the toggle.

### Behavior

| Gesture         | Action                                    |
| --------------- | ----------------------------------------- |
| **Swipe left**  | Next filter (`home` → `all` → `away`)     |
| **Swipe right** | Previous filter (`away` → `all` → `home`) |

### Implementation

Modified file: `frontend/app/(tabs)/calendar.tsx`

- Imported `PanResponder` from `react-native`.
- Created a `swipePanResponder` via `useMemo` that:
  - Only captures **horizontal** swipes (`|dx| > 20` and `|dx| > |dy| * 1.5`) so vertical scrolling is unaffected.
  - On release, if `dx < -30` cycles to the next filter; if `dx > 30` cycles to the previous filter.
- Attached `{...swipePanResponder.panHandlers}` to the root `ThemedView`.
- Extracted the filter-cycling logic into pure helpers in `frontend/utils/homeGameFilter.ts` for testability.

### Tests

Added `frontend/utils/homeGameFilter.test.ts` with 8 unit tests covering:

- `getNextHomeGameFilter` — cycles `home → all → away → home` and falls back to `all` for unknown values
- `getPreviousHomeGameFilter` — cycles `away → all → home → away` and falls back to `all` for unknown values

### Modified files

| File                                    | Change                                                          |
| --------------------------------------- | --------------------------------------------------------------- |
| `frontend/app/(tabs)/calendar.tsx`      | Added `PanResponder` swipe gesture for home/away filter cycling |
| `frontend/utils/homeGameFilter.ts`      | New pure helpers for filter cycling                             |
| `frontend/utils/homeGameFilter.test.ts` | New unit tests (8 tests)                                        |
| `frontend/docs/calendar.tsx.md`         | Updated documentation                                           |
| `frontend/docs/homeGameFilter.ts.md`    | New documentation                                               |

---

## Fix: theme briefly flashes light on web (color flicker)

### Symptom

On web, filter elements (e.g. `PillToggle` in `rightElement`) flashed red → black → red when arriving on a page. The browser theme appeared to briefly switch to light before settling on dark.

### Root cause

`useColorScheme.web.ts` returned `'light'` before hydration (to support static rendering), then the real theme (`'dark'`) after. This artificial `light → dark` transition:

- Bright the whole theme (and derived accent colors) to light on first paint.
- Triggered a spurious recompute in `useFavoriteColor` (with `NHL-NJ`: `backgroundColor: '#000'` wins in light mode → black).

### Solution

Two files changed.

#### `frontend/hooks/useColorScheme.web.ts` — return the real theme immediately

Replaced the `hasHydrated` state with `useSyncExternalStore` backed by `matchMedia('(prefers-color-scheme: dark)')`. The bundle hydrates with the actual browser theme, so there is no artificial `'light'` first paint.

```typescript
export function useColorScheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

#### `frontend/hooks/useFavoriteColor.ts` — initial computation uses the real browser theme

For the initial `useState` computation, read the browser's actual theme directly via `getBrowserTheme()`, so the first calculation can never run with the SSR `'light'` snapshot when the browser is actually dark.

### Modified files

| File                                   | Change                                                         |
| -------------------------------------- | -------------------------------------------------------------- |
| `frontend/hooks/useColorScheme.web.ts` | `useSyncExternalStore` + `matchMedia` → real theme immediately |
| `frontend/hooks/useFavoriteColor.ts`   | Initial compute uses `getBrowserTheme()`                       |
| `frontend/docs/useFavoriteColor.ts.md` | Updated documentation                                          |

---

## Fix: `useFavoriteColor` — red → black → red flicker on web

### Symptom

On the Calendar tab (and other screens), the filter elements (e.g. `PillToggle` in `rightElement`) flashed red → black → red when arriving on the page, with the favorite team `NHL-NJ` selected.

### Root cause

- `NHL-NJ` has `color: '#e30b2b'` (red, brightness ≈ 84) and `backgroundColor: '#000000'` (black, brightness 0).
- In `computeFavoriteColor`:
  - **dark mode** (real theme): "lightest" → `84 > 0` → red.
  - **light mode**: "darkest" → `84 < 0` is false → `teamBg` (black).
- `useColorScheme.web` returns `'light'` before hydration, then the real theme (`'dark'`) afterwards. The `prevTheme` effect detected this artificial `light → dark` transition and triggered an immediate recompute in **light** mode → black color, before switching back to red.

### Solution

Modified file: `frontend/hooks/useFavoriteColor.ts`

1. **Ignore first hydration transition** — `prevTheme` starts as `null`; the first render only records the theme without recomputing:

```typescript
const prevTheme = useRef<string | null>(null);
useEffect(() => {
  if (prevTheme.current === null) {
    prevTheme.current = theme;
    return;
  }
  if (prevTheme.current !== theme) {
    prevTheme.current = theme;
    updateColor();
  }
}, [theme, updateColor]);
```

2. **Robustness fallback** — `finalColor = finalColor || color || defaultColor` prefers the team's own `color` before the default if `backgroundColor` is ever missing.

### Modified files

| File                                   | Change                                                  |
| -------------------------------------- | ------------------------------------------------------- |
| `frontend/hooks/useFavoriteColor.ts`   | Ignore hydration theme transition + robustness fallback |
| `frontend/docs/useFavoriteColor.ts.md` | Updated documentation                                   |

---

## Fix: `useFavoriteColor` — async refresh updates session only (no re-render)

### Problem

The 2s async refresh called `updateColor()`, which updated the displayed color via `setColors`. This caused an unnecessary re-render of the component even though the displayed value was already correct.

### Solution

Modified file: `frontend/hooks/useFavoriteColor.ts`

Split the logic into two functions:

- `recomputeAndStore()` — recomputes the color and persists it to `sessionStorage` **without** calling `setColors` (no re-render). Used by the 2s async refresh.
- `updateColor()` — calls `recomputeAndStore()` then `setColors()` to update the display. Used by theme change, `firestoreReady`, and `favoritesUpdated` events.

```typescript
const recomputeAndStore = useCallback(() => {
  cachedColors = computeFavoriteColor(theme, defaultColor);
  writeStoredColors(cachedColors);
  return cachedColors;
}, [theme, defaultColor]);

const updateColor = useCallback(() => {
  setColors(recomputeAndStore());
}, [recomputeAndStore]);
```

The 2s async refresh now only refreshes the session for future mounts, without re-rendering the current component.

### Modified files

| File                                   | Change                                              |
| -------------------------------------- | --------------------------------------------------- |
| `frontend/hooks/useFavoriteColor.ts`   | Async refresh stores to session without `setColors` |
| `frontend/docs/useFavoriteColor.ts.md` | Updated documentation                               |

---

## Feature: `useFavoriteColor` — immediate recompute on theme change

### Problem

When the browser theme changed (dark ↔ light), the accent color was only recomputed after the 2s async refresh, causing a visible delay before the color adapted to the new theme.

### Solution

Modified file: `frontend/hooks/useFavoriteColor.ts`

Added a `prevTheme` ref that detects a theme change and recomputes the color **immediately**, without waiting for the 2s async refresh:

```typescript
const prevTheme = useRef(theme);
useEffect(() => {
  if (prevTheme.current !== theme) {
    prevTheme.current = theme;
    updateColor();
  }
}, [theme, updateColor]);
```

The 2s async refresh still runs on mount (stale-while-revalidate), but theme changes now update the color right away.

### Modified files

| File                                   | Change                                                  |
| -------------------------------------- | ------------------------------------------------------- |
| `frontend/hooks/useFavoriteColor.ts`   | Immediate recompute on theme change via `prevTheme` ref |
| `frontend/docs/useFavoriteColor.ts.md` | Updated documentation                                   |

---

## Fix: `useFavoriteColor` — sync module cache when reading from sessionStorage

### Problem

When a value was read from `sessionStorage` on mount, the module-level `cachedColors` was **not** updated. If another hook instance mounted before the 2s async recompute, it would re-read `sessionStorage` (or recompute if storage was unavailable), risking inconsistency between instances.

### Solution

Modified file: `frontend/hooks/useFavoriteColor.ts`

When the stored value is found, it is now also written into `cachedColors` so all hook instances share the same value immediately:

```typescript
const [colors, setColors] = useState(() => {
  const stored = readStoredColors();
  if (stored) {
    cachedColors = stored; // sync module cache
    return stored;
  }
  // ...
});
```

### Final behavior (stale-while-revalidate)

| Scenario            | Behavior                                                               |
| ------------------- | ---------------------------------------------------------------------- |
| No stored value     | Compute synchronously, persist to `sessionStorage`, return immediately |
| Stored value exists | Return it immediately, then recompute asynchronously after 2s          |

### Modified files

| File                                   | Change                                                 |
| -------------------------------------- | ------------------------------------------------------ |
| `frontend/hooks/useFavoriteColor.ts`   | Sync `cachedColors` when reading from `sessionStorage` |
| `frontend/docs/useFavoriteColor.ts.md` | Updated documentation                                  |

---

## Feature: `useFavoriteColor` — sessionStorage instant return + async refresh

### Overview

The `useFavoriteColor` hook now stores the computed accent color in `sessionStorage`. On mount, the stored value is returned **immediately** (no computation, no flash), then the color is **recomputed asynchronously 2 seconds** later to keep it up to date.

### Problem

- The color was computed synchronously on every mount, which could cause a brief flash or delay.
- The module-level cache only lived for the lifetime of the JS context (tab session), but was not persisted across full page reloads.

### Solution

Modified file: `frontend/hooks/useFavoriteColor.ts`

#### sessionStorage persistence

```typescript
const STORAGE_KEY = 'favoriteColor';
```

- `readStoredColors()` — reads and parses `{ backgroundColor, textColor }` from `sessionStorage`, returns `null` on missing/corrupted data.
- `writeStoredColors(colors)` — serializes and writes the colors, silently ignoring storage errors (private mode, quota).

#### Instant return

```typescript
const [colors, setColors] = useState(() => {
  const stored = readStoredColors();
  if (stored) return stored;
  if (cachedColors) return cachedColors;
  cachedColors = computeFavoriteColor(theme, defaultColor);
  writeStoredColors(cachedColors);
  return cachedColors;
});
```

Priority order on first render:

1. `sessionStorage` (no computation)
2. Module-level `cachedColors`
3. Synchronous computation, persisted to storage

#### Async refresh after 2 seconds

```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    updateColor();
  }, 2000);
  return () => clearTimeout(timeout);
}, [updateColor]);
```

Every mount (or theme change) schedules a background recomputation after 2 seconds. `updateColor()` recomputes, persists to `sessionStorage`, and updates state.

### Final behavior

| Scenario                   | First render                      | After 2s / event                        |
| -------------------------- | --------------------------------- | --------------------------------------- |
| First load (logged in)     | Stored value returned immediately | Recompute from synced cache             |
| First load (not logged in) | Stored value returned immediately | Recompute from cache                    |
| Tab switch                 | Stored value returned immediately | Recompute (same value → no re-render)   |
| Add/remove a favorite      | Stored value returned immediately | `favoritesUpdated` event → clean update |
| Theme change               | Stored value returned immediately | Recompute with new theme after 2s       |

### Modified files

| File                                   | Change                                                          |
| -------------------------------------- | --------------------------------------------------------------- |
| `frontend/hooks/useFavoriteColor.ts`   | sessionStorage read/write + instant return + 2s async recompute |
| `frontend/docs/useFavoriteColor.ts.md` | Updated documentation                                           |

---

## Feature: "Show all results" option in NoResults when filters hide results

### Overview

When the `NoResults` component is displayed on the **index** (Games of the Day) and **schedule** (Focus Team) screens with an active filter and the manual retry is in cooldown, the user is now offered a "Show all results" button to switch back to the "All" option.

### Problem

- When a user filtered games (e.g., by a specific league/team or a specific team in Schedule) and no games matched, `NoResults` was displayed.
- During the 60s retry cooldown, the refresh button was hidden, leaving the user with no actionable option.
- The user could only wait for the cooldown to expire or manually change filters.

### Solution

- Extended `NoResults` with a new optional `onShowAll` prop.
- When the retry cooldown is active **and** `onShowAll` is provided, a "Show all results" button is rendered instead of the refresh icon.
- Clicking the button calls the provided handler, which resets the filter to "ALL".

### Behavior per screen

| Screen                       | Condition to show button                                                                    | Action                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Index** (Games of the Day) | `activeFilter !== 'ALL'` OR a team is selected OR fewer leagues selected than all available | Calls `handleFilterChange('ALL')`        |
| **Schedule** (Focus Team)    | `teamSelected` is not `'all'` and not `''`                                                  | Calls `handleTeamSelectionChange('all')` |

### Modified files

| File                                        | Change                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `frontend/components/NoResults.tsx`         | Added `onShowAll` prop and "Show all results" button shown during retry cooldown |
| `frontend/app/(tabs)/index.tsx`             | Passes `onShowAll` when a filter is active                                       |
| `frontend/app/(tabs)/schedule.tsx`          | Passes `onShowAll` when a specific team is selected                              |
| `frontend/utils/utils.tsx`                  | Added `showAllResults` translation key to all 11 languages                       |
| `frontend/docs/components/NoResults.tsx.md` | Updated documentation                                                            |

---

## Feature: Data synchronization between localStorage and Firestore

### Overview

Implemented a centralized sync service (`frontend/utils/syncService.ts`) that handles all data synchronization between localStorage and Firebase Firestore, with a React hook wrapper (`frontend/hooks/useSync.ts`).

### Behavior

| Scenario                            | Behavior                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------ |
| **Guest mode** (unauthenticated)    | All data read/written to localStorage only. No Firestore calls.          |
| **Login — Firestore has data**      | Firestore takes priority. Overwrites localStorage and updates app state. |
| **Login — no Firestore data**       | Current localStorage data is pushed to Firestore for this user.          |
| **Login — Firestore error/offline** | Falls back seamlessly to localStorage without blocking the user.         |
| **Authenticated writes**            | Every local change is replicated to Firestore with 800ms debounce.       |
| **Firestore write failure**         | Error is logged and swallowed; app continues on localStorage.            |
| **Logout / user switch**            | Pending debounced writes are flushed immediately via `flushSync()`.      |

### Key implementation details

- **Timeout guard** — all Firestore operations wrapped in `executeFirestoreWithTimeout` (10s default) using `Promise.race`.
- **Debounce** — `syncToFirestore()` merges rapid successive writes into a single Firestore call after 800ms of inactivity.
- **Module-level state** — debounce timer and pending data survive component unmounts.
- **`hasFirestoreData()`** — treats empty/profile-only documents as "no data" so local data is pushed instead of overwritten.
- **`flushSync()`** — called on logout (`connection.tsx`) and user switch (`_layout.tsx`) to avoid losing pending changes.

### Modified files

| File                                 | Change                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `frontend/utils/syncService.ts`      | Central sync service (read/write local, pull/push Firestore, debounced writes, timeout, fallback) |
| `frontend/utils/syncService.test.ts` | 23 unit tests covering all scenarios including offline/error states                               |
| `frontend/hooks/useSync.ts`          | React hook wrapper exposing `syncData`, `syncOnLogin`, `flushSync`                                |
| `frontend/app/(tabs)/connection.tsx` | Added `flushSync()` before `signOut()` on logout                                                  |
| `frontend/app/(tabs)/_layout.tsx`    | Added `flushSync()` on user switch before starting new user's sync                                |
| `frontend/docs/syncService.ts.md`    | New documentation for syncService                                                                 |
| `frontend/docs/useSync.ts.md`        | New documentation for useSync hook                                                                |

---

## Problem: Opponent (VS) filter not recalculated when filtering by month

### Symptom

When filtering by month in the Schedule tab, the opponent (VS) filter was not recalculated. The opponent list remained empty or stale.

### Root cause

- `monthFilter` state contains values like `"January 2026"` (month + year format).
- The `uniqueTeamsFromGames` useMemo in `schedule.tsx` only extracted the month name (`"January"`) without the year.
- `monthFilter.includes(month)` always returned `false`, so every day was skipped via `continue`, resulting in an empty opponent list.

### Solution

Modified file: `frontend/app/(tabs)/schedule.tsx`

Updated the month comparison to build the full month key matching the `monthFilter` format:

```typescript
if (monthFilter.length > 0) {
  const year = new Date(day).getFullYear();
  const month = new Date(day).toLocaleString('default', { month: 'long' });
  const monthKey = `${month} ${year}`;
  if (!monthFilter.includes(monthKey)) continue;
}
```

Also changed `showTeamFilter` from `> 1` to `> 0` so the filter shows even with a single opponent.

---

## Problem: Firestore data was not overriding local data on sta rtup

### Symptom

When a logged-in user opened the app, local cache data was used for the first render, then Firestore data would apply afterwards. This caused a flicker where the user saw old preferences before they were replaced by Firestore data.

### Root cause

- `_layout.tsx` had an `onSnapshot` Firestore listener that wrote to the local cache via `applyFirestoreData()`.
- Child screens (`schedule.tsx`, `index.tsx`, `calendar.tsx`) initialized their state from the local cache **in the same render cycle** as mounting.
- The Firestore listener runs **asynchronously**: `applyFirestoreData` writes to the cache after the children's first render.
- Result: children read the cache before it was overwritten by Firestore.

### Solution: `firestoreReady` in AuthContext

Modified files:

- `frontend/context/AuthContext.tsx`
- `frontend/app/(tabs)/_layout.tsx`
- `frontend/app/(tabs)/schedule.tsx`
- `frontend/app/(tabs)/index.tsx`
- `frontend/app/(tabs)/calendar.tsx`

#### `AuthContext.tsx`

Added two new values to the context:

- `firestoreReady: boolean` — `false` until Firestore sync is complete
- `setFirestoreReady: (ready: boolean) => void` — setter to let `_layout.tsx` signal sync completion

#### `_layout.tsx`

- **When `user === null`** (not logged in): `setFirestoreReady(true)` immediately. Nothing to sync.
- **When `user` exists** (logged in): the `onSnapshot` listener calls `setFirestoreReady(true)`:
  - After the **first successful snapshot** (even if the Firestore document doesn't exist yet)
  - **On error** too, so the app can still work with local data

```typescript
useEffect(() => {
  if (!user) {
    setFirestoreReady(true);
    return;
  }
  const unsubscribe = onSnapshot(
    doc(db, 'users', user.uid),
    (docSnap) => {
      if (docSnap.exists()) {
        applyFirestoreData(data); // overwrites local cache
      }
      setFirestoreReady(true); // ✅ sync complete
    },
    (err) => {
      console.error(err);
      setFirestoreReady(true); // ✅ even on error
    },
  );
  return () => unsubscribe();
}, [user]);
```

#### Child screens (`schedule.tsx`, `index.tsx`, `calendar.tsx`)

Each screen that initializes data from the local cache must wait for `firestoreReady`:

```typescript
const { user, firestoreReady } = useAuth();

useEffect(() => {
  if (!firestoreReady) return; // ⏳ wait for Firestore sync
  // ← cache has already been overwritten by Firestore if user is logged in
  initializeFromCache();
}, [firestoreReady]);
```

### Operation order (logged in)

1. `useAuth()` → `firestoreReady = false`
2. Screens mount but their `useEffect` doesn't run (guarded by `firestoreReady`)
3. `_layout.tsx` starts `onSnapshot` Firestore listener
4. Firestore responds → `applyFirestoreData()` overwrites local cache
5. `setFirestoreReady(true)`
6. Children's `useEffect` fires → reads cache → gets Firestore data

---

## Problem: Color flickering (`useFavoriteColor`)

### Symptom

On every tab switch, the color briefly flashed to the default value (`#000` or `#3b82f6`) before showing the favorite team's color.

### Root cause

- `useFavoriteColor` initialized with `useState(defaultColor)` then recalculated in `useEffect`.
- On tab switch, the component unmounts/remounts → state resets → flash of default color.

### Solution: Module-level cache + `firestoreReady` wait

Modified file: `frontend/hooks/useFavoriteColor.ts`

#### Module-level cache (`cachedColors`)

```typescript
let cachedColors: { backgroundColor: string; textColor: string } | null = null;
```

The variable is declared **outside the hook** (at module level). All hook instances share the same reference. Once computed, the color persists even if the component unmounts.

#### Synchronous initialization with cache

```typescript
const [colors, setColors] = useState(() => {
  if (!cachedColors) {
    cachedColors = computeFavoriteColor(theme, defaultColor);
  }
  return cachedColors;
});
```

- `computeFavoriteColor` reads `getCache('favoriteTeams')` synchronously.
- The result is stored in `cachedColors`.
- Subsequent instances (tab switch) immediately get the last computed color with no flash.

#### Update after Firestore sync

```typescript
useEffect(() => {
  if (firestoreReady) {
    updateColor(); // recompute from cache (now overwritten by Firestore)
  }
}, [firestoreReady, updateColor]);
```

When `firestoreReady` becomes `true`, the color is recomputed. If the cache hasn't changed (user not logged in, or same favorites), `setColors` receives the same value → React doesn't re-render.

#### Event listener

```typescript
useEffect(() => {
  window.addEventListener('favoritesUpdated', updateColor);
  return () => window.removeEventListener('favoritesUpdated', updateColor);
}, [updateColor]);
```

### Final behavior

| Scenario                   | Flash? | Why                                                                                                   |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| First load (logged in)     | No     | `useState` reads cache, then `firestoreReady` triggers a silent update (same value if already synced) |
| First load (not logged in) | No     | `firestoreReady = true` immediately, synchronous computation from cache                               |
| Tab switch                 | No     | `cachedColors` module-level already populated                                                         |
| Add/remove a favorite      | No     | `favoritesUpdated` event → clean update                                                               |

---

## Feature: Animated filter label on accordion toggle

### Overview

The `FilterAccordion` label (including the dynamic filter value after the colon) now plays a subtle **fade-in + slide-down** CSS animation whenever the accordion is opened or closed. This makes the appearance/disappearance of the filter text feel smooth instead of abrupt.

### Implementation

Modified file: `frontend/components/FilterAccordion.tsx`

- Wrapped the `label` in a `<span>` with `key={String(expanded)}` so React re-mounts the span on every expand/collapse, replaying the animation.
- Added a `@keyframes filterLabelIn` animation: `opacity: 0 → 1` and `translateY(-4px) → 0`, with a `0.25s ease-out` duration.
- Applied only on mobile (accordion mode); desktop is unaffected.

### Modified files

| File                                      | Change type                       |
| ----------------------------------------- | --------------------------------- |
| `frontend/components/FilterAccordion.tsx` | Animated label on expand/collapse |

---

## Feature: Date span only visible when accordion is closed

### Overview

On mobile, the date filter accordion's label (the `<span>` containing the formatted date) is now only shown when the accordion is **closed**. When the accordion is open, only the plain "Date" label is displayed. On desktop (no accordion), the span is never shown.

### Implementation

Modified file: `frontend/app/(tabs)/index.tsx`

- Added state `dateAccordionExpanded` (default `false`).
- Passed `onExpandedChange={setDateAccordionExpanded}` to the date `FilterAccordion`.
- The `label` prop now renders the `<span>` with the date only when `isSmallDevice && !dateAccordionExpanded`; otherwise it renders the plain translated "Date" label.

### Modified files

| File                            | Change type                       |
| ------------------------------- | --------------------------------- |
| `frontend/app/(tabs)/index.tsx` | Conditional date span + new state |

---

## Dynamic filter label for Calendar filters

The Calendar tab's accordions now also show the selected filters in their labels when the accordion is **closed**:

- **Teams**: lists selected teams by their **short name** (`abbrev`) joined by commas (e.g. `NJD, CHC, DEN, SEA`). Hidden teams are excluded.
- **Date range**: shows the selected period as `start - end` (e.g. `Aug 22, 2026 - Sep 5, 2026`).

Long text is truncated with ellipses via CSS `text-overflow: ellipsis`.

Modified file: `frontend/app/(tabs)/calendar.tsx`

---

## Feature: Dynamic league accordion label

### Overview

The league filter accordion's label now dynamically reflects the current filter state, but only when the accordion is closed:

- If a **team** is selected, the label shows `"Filter by league / team : <LEAGUE> / <team short name>"` (e.g. `MLB / CHC`).
- If a **specific league** is selected (not `ALL`, `FAVORITES`, or `BOOKMARKS`), the label shows `"Filter by league / team : <league name>"`.
- Otherwise, the default translated label ("League / Team" on mobile, "League" on desktop) is shown.

### Implementation

Modified file: `frontend/app/(tabs)/index.tsx`

- Added state `leagueAccordionExpanded` (default `false`).
- Passed `onExpandedChange={setLeagueAccordionExpanded}` to the league `FilterAccordion`.
- Added `leagueAccordionLabel` useMemo that:
  1. Only shows the dynamic label when `!leagueAccordionExpanded`.
  2. Checks `teamSelectedId` first — if a team is selected, finds it in `teamsOfTheDay` and returns `{ prefix, value: "<league> / <abbrev>" }` using `translateFilterLabel('league_team')` as the prefix.
  3. Otherwise, if `activeFilter` is a specific league, returns `{ prefix, value: "<league>" }`.
  4. Falls back to the translated default label.
- The value is rendered with the same styling as the date filter: `<span>{prefix} : <i><b>{value}</b></i></span>`.
- The league `FilterAccordion` now uses `leagueAccordionLabel` as its `label` prop.
- The same pattern is applied to `schedule.tsx` for the team/league and date/month accordions.

### Modified files

| File                               | Change type                               |
| ---------------------------------- | ----------------------------------------- |
| `frontend/app/(tabs)/index.tsx`    | Dynamic league/team label                 |
| `frontend/app/(tabs)/schedule.tsx` | Dynamic team/league + date/month labels   |
| `frontend/utils/utils.tsx`         | Exported `getFilterAccordionLabel` helper |

---

## Summary of modified files

| File                                 | Change type                                         |
| ------------------------------------ | --------------------------------------------------- |
| `frontend/context/AuthContext.tsx`   | Added `firestoreReady` + `setFirestoreReady`        |
| `frontend/app/(tabs)/_layout.tsx`    | Call `setFirestoreReady(true)` after Firestore sync |
| `frontend/app/(tabs)/schedule.tsx`   | Wait for `firestoreReady` before initialization     |
| `frontend/app/(tabs)/index.tsx`      | Wait for `firestoreReady` before initialization     |
| `frontend/app/(tabs)/calendar.tsx`   | Wait for `firestoreReady` before initialization     |
| `frontend/hooks/useFavoriteColor.ts` | Module-level cache + `firestoreReady` wait          |
| `frontend/app/(tabs)/schedule.tsx`   | Fixed month filter opponent recalculation           |
