# File: `frontend/app/(tabs)/_layout.tsx`

## Purpose

The **Tab Layout** file defines the bottom tab navigation for the app and handles the **Firestore synchronization** between local cache and the user's Firestore document.

## Key Features

- **Tab navigation** — 4 tabs: Game of the Day, Schedule, Calendar, Connection
- **Firestore sync** — bidirectional sync between local cache and Firestore
- **`firestoreReady` signaling** — tells child screens when Firestore sync is complete
- **Event dispatching** — dispatches `favoritesUpdated`, `leaguesUpdated`, `scoresUpdated`, etc. after sync
- **User avatar** — shows profile photo in the Connection tab when logged in

## Key Functions

### `applyFirestoreData(data)`

Applies Firestore data to the local cache:

1. **If Firestore has data** (favoriteTeams, leaguesSelected, showScores, etc.):
   - Saves all data to local cache via `saveCache` / `localStorage.setItem`
   - Restores `teamsSelected` as full `Team[]` objects from team IDs

2. **If Firestore is empty**:
   - Pushes local cache data to Firestore via `setDoc` with `{ merge: true }`

3. **Always**:
   - Ensures teams are cached (fetches from API if needed)
   - Dispatches events to notify all screens of the data update

### `useEffect` — Firestore listener

```typescript
useEffect(() => {
  if (!user) {
    setFirestoreReady(true); // No user → nothing to sync
    return;
  }
  const unsubscribe = onSnapshot(
    userRef,
    (docSnap) => {
      if (docSnap.exists()) applyFirestoreData(docSnap.data());
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

## Data Flow

1. `AuthProvider` wraps the tab layout
2. On mount, if user is logged in, starts `onSnapshot` listener on `users/{uid}`
3. First snapshot: applies Firestore data to local cache, dispatches events, sets `firestoreReady = true`
4. Child screens wait for `firestoreReady` before initializing from cache
5. If no user: `firestoreReady = true` immediately
