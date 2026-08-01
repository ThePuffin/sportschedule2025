# Architecture & Recent Changes

> **📚 Per-file documentation:** For detailed AI-readable documentation of each file, see the [`frontend/docs/`](./docs/) directory. Each file has a corresponding `.md` file explaining its purpose, features, state, functions, and data flow.

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
