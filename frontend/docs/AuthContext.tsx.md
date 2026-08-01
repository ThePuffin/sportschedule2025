# File: `frontend/context/AuthContext.tsx`

## Purpose

The **Auth Context** provides authentication state and Firestore readiness to the entire app. It wraps the app in an `AuthProvider` and exposes `useAuth()` hook.

## Key Features

- **User state** — tracks the current Firebase auth user
- **Loading state** — indicates when auth state is being determined
- **`firestoreReady`** — signals when Firestore sync is complete (prevents flicker)
- **`setFirestoreReady`** — setter for the layout to signal sync completion

## Context Interface

```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  firestoreReady: boolean;
  setFirestoreReady: (ready: boolean) => void;
}
```

## Key Functions

### `AuthProvider({ children })`

Wraps the app and provides auth state:

1. Subscribes to `onAuthStateChanged(auth, ...)` on mount
2. Updates `user` and `loading` when auth state changes
3. Provides `firestoreReady` (initially `false`) and `setFirestoreReady`

### `useAuth()`

Hook that returns the auth context:

```typescript
export const useAuth = () => useContext(AuthContext);
```

## Data Flow

1. `AuthProvider` mounts and starts listening to Firebase auth state
2. When auth state resolves, `user` and `loading` are updated
3. `_layout.tsx` calls `setFirestoreReady(true)` after Firestore sync
4. Child screens use `useAuth()` to access `user`, `loading`, and `firestoreReady`
