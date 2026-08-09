import { useAuth } from '@/context/AuthContext';
import { flushSync, SyncData, syncOnLogin, syncToFirestore } from '@/utils/syncService';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook providing data synchronization between localStorage and Firestore.
 *
 * Usage:
 *   const { syncData, syncOnLogin } = useSync();
 *
 *   // Save to localStorage AND replicate to Firestore (debounced) if logged in
 *   syncData({ favoriteTeams: ['NFL-SF'] });
 *
 *   // On login, orchestrate the pull/push sync
 *   await syncOnLogin();
 */
export const useSync = () => {
  const { user } = useAuth();
  const userIdRef = useRef<string | null>(null);

  // Keep the latest userId in a ref so callbacks don't need to re-create
  useEffect(() => {
    userIdRef.current = user?.uid ?? null;
  }, [user]);

  /**
   * Save data to localStorage (via the caller's saveCache/localStorage.setItem)
   * and replicate to Firestore with debouncing when a user is logged in.
   *
   * IMPORTANT: The caller is responsible for writing to localStorage first.
   * This hook only handles the Firestore replication side.
   */
  const syncData = useCallback((data: SyncData) => {
    const uid = userIdRef.current;
    if (uid) {
      syncToFirestore(uid, data);
    }
    // Guest mode: no Firestore call, localStorage is the only store.
  }, []);

  /**
   * Orchestrate the login sync (pull Firestore → local, or push local → Firestore).
   * Returns 'firestore' | 'local' | 'error'.
   */
  const handleSyncOnLogin = useCallback(async (): Promise<'firestore' | 'local' | 'error'> => {
    const uid = userIdRef.current;
    if (!uid) return 'error';
    return syncOnLogin(uid);
  }, []);

  /**
   * Flush any pending debounced writes. Call on logout / user switch.
   */
  const handleFlush = useCallback(async () => {
    await flushSync();
  }, []);

  return { syncData, syncOnLogin: handleSyncOnLogin, flushSync: handleFlush };
};
