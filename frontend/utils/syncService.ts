import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getCache, saveCache } from './fetchData';
import { db } from './firebaseConfig';

/**
 * Centralized data synchronization service between localStorage and Firestore.
 *
 * Handles:
 * - Guest mode: localStorage only (no Firestore calls)
 * - Login sync: pull Firestore data → overwrite local, or push local → Firestore
 * - Authenticated writes: debounced replication of local changes to Firestore
 * - Graceful fallback to localStorage when Firestore is unreachable
 */

export const SYNC_KEYS = [
  'favoriteTeams',
  'leaguesSelected',
  'showScores',
  'showPreviousScores',
  'gameSelected',
  'teamsSelected',
  'teamsSelectedLeagues',
  'startDate',
  'endDate',
  'teamSelected',
  'leagueSelected',
] as const;

export interface SyncData {
  favoriteTeams?: string[];
  leaguesSelected?: string[];
  showScores?: boolean;
  showPreviousScores?: boolean;
  gameSelected?: unknown[];
  teamsSelected?: string[];
  teamsSelectedLeagues?: Record<string, string>;
  startDate?: string | null;
  endDate?: string | null;
  teamSelected?: string | null;
  leagueSelected?: string | null;
}

export const DEFAULT_DEBOUNCE_MS = 800;
export const FIRESTORE_TIMEOUT_MS = 10000;

// --- Debounce state (module-level so it survives component unmounts) ---
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingData: SyncData | null = null;
let pendingUserId: string | null = null;

const executeFirestoreWithTimeout = async <T>(
  operation: () => Promise<T>,
  activity: string,
  timeoutMs: number = FIRESTORE_TIMEOUT_MS,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Firestore ${activity} timed out after ${timeoutMs} ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(), timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Read all user-preference data from localStorage / cache.
 * Used for guest mode and for pushing local data to Firestore on login.
 */
export const readLocalData = (): SyncData => {
  const teamsSelectedRaw = getCache<{ uniqueId: string }[]>('teamsSelected') || [];
  return {
    favoriteTeams: getCache<string[]>('favoriteTeams') || [],
    leaguesSelected: getCache<string[]>('leaguesSelected') || [],
    showScores: getCache<boolean>('showScores') ?? false,
    showPreviousScores: getCache<boolean>('showPreviousScores') ?? false,
    gameSelected: getCache<unknown[]>('gameSelected') || [],
    teamsSelected: teamsSelectedRaw.map((t) => t.uniqueId).filter(Boolean),
    teamsSelectedLeagues: getCache<Record<string, string>>('teamsSelectedLeagues') || {},
    startDate: localStorage.getItem('startDate'),
    endDate: localStorage.getItem('endDate'),
    teamSelected: localStorage.getItem('teamSelected'),
    leagueSelected: localStorage.getItem('leagueSelected'),
  };
};

/**
 * Overwrite localStorage with Firestore data.
 * Used when Firestore has data and takes priority over local cache.
 */
export const applyFirestoreDataToLocal = (data: SyncData): void => {
  saveCache('favoriteTeams', data.favoriteTeams || []);
  saveCache('leaguesSelected', data.leaguesSelected || []);
  saveCache('showScores', data.showScores ?? false);
  saveCache('showPreviousScores', data.showPreviousScores ?? false);
  saveCache('gameSelected', data.gameSelected || []);
  if (data.teamsSelectedLeagues) saveCache('teamsSelectedLeagues', data.teamsSelectedLeagues);
  if (data.teamSelected) localStorage.setItem('teamSelected', data.teamSelected);
  if (data.leagueSelected) localStorage.setItem('leagueSelected', data.leagueSelected);
  if (data.startDate) localStorage.setItem('startDate', data.startDate);
  if (data.endDate) localStorage.setItem('endDate', data.endDate);
};

/**
 * Determine whether a Firestore document contains meaningful user data.
 * An empty document (only lastLogin / profile fields) is treated as "no data".
 */
export const hasFirestoreData = (data: SyncData): boolean => {
  return (
    (Array.isArray(data.favoriteTeams) && data.favoriteTeams.length > 0) ||
    (Array.isArray(data.leaguesSelected) && data.leaguesSelected.length > 0) ||
    data.showScores !== undefined ||
    data.showPreviousScores !== undefined ||
    (Array.isArray(data.gameSelected) && data.gameSelected.length > 0) ||
    (data.teamsSelectedLeagues !== undefined &&
      data.teamsSelectedLeagues !== null &&
      typeof data.teamsSelectedLeagues === 'object' &&
      Object.keys(data.teamsSelectedLeagues).length > 0)
  );
};

/**
 * Fetch a user's document from Firestore with a timeout guard.
 * Throws on network errors / timeouts so callers can fall back to local data.
 */
export const fetchUserDataFromFirestore = async (userId: string): Promise<SyncData | null> => {
  const userRef = doc(db, 'users', userId);

  try {
    const docSnap = await executeFirestoreWithTimeout(async () => getDoc(userRef), 'read', FIRESTORE_TIMEOUT_MS);

    if (docSnap.exists()) {
      return docSnap.data() as SyncData;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user data from Firestore:', error);
    throw error;
  }
};

/**
 * Write the current localStorage data to the user's Firestore document.
 * Used when the user has no existing Firestore data (first login / registration).
 */
export const pushLocalDataToFirestore = async (userId: string): Promise<void> => {
  const localData = readLocalData();
  const userRef = doc(db, 'users', userId);

  try {
    await executeFirestoreWithTimeout(
      async () => setDoc(userRef, { ...localData, lastLogin: serverTimestamp() }, { merge: true }),
      'write',
      FIRESTORE_TIMEOUT_MS,
    );
  } catch (error) {
    console.error('Error pushing local data to Firestore:', error);
    throw error;
  }
};

/**
 * Orchestrate the login sync:
 * 1. Try to fetch Firestore data.
 * 2. If data exists → overwrite localStorage with it.
 * 3. If no data → push localStorage to Firestore.
 * 4. If Firestore errors → fall back to localStorage (no-op, return 'error').
 *
 * @returns 'firestore' | 'local' | 'error'
 */
export const syncOnLogin = async (userId: string): Promise<'firestore' | 'local' | 'error'> => {
  try {
    const firestoreData = await fetchUserDataFromFirestore(userId);
    if (firestoreData && hasFirestoreData(firestoreData)) {
      applyFirestoreDataToLocal(firestoreData);
      return 'firestore';
    }
    await pushLocalDataToFirestore(userId);
    return 'local';
  } catch (error) {
    console.error('Firestore sync failed, falling back to local data:', error);
    return 'error';
  }
};

/**
 * Debounced replication of local changes to Firestore.
 * Multiple rapid writes are merged into a single Firestore call after
 * `DEFAULT_DEBOUNCE_MS` of inactivity. Errors are logged and swallowed so
 * the app continues operating on local storage.
 */
export const syncToFirestore = (userId: string, data: SyncData): void => {
  if (!userId) return;

  // Merge with any pending data so rapid successive writes collapse into one call.
  pendingData = { ...(pendingData || {}), ...data };
  pendingUserId = userId;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    const dataToSend = pendingData;
    const uid = pendingUserId;
    pendingData = null;
    pendingUserId = null;
    debounceTimer = null;

    if (!uid || !dataToSend) return;

    executeFirestoreWithTimeout(
      async () => setDoc(doc(db, 'users', uid), { ...dataToSend, lastUpdate: serverTimestamp() }, { merge: true }),
      'write',
      FIRESTORE_TIMEOUT_MS,
    ).catch((error) => {
      console.error('Error syncing to Firestore:', error);
      // Local storage remains the source of truth; next change will retry.
    });
  }, DEFAULT_DEBOUNCE_MS);
};

/**
 * Immediately flush any pending debounced write to Firestore.
 * Call this on logout / user switch to avoid losing pending changes.
 */
export const flushSync = async (): Promise<void> => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (pendingData && pendingUserId) {
    const dataToSend = pendingData;
    const uid = pendingUserId;
    pendingData = null;
    pendingUserId = null;

    try {
      await executeFirestoreWithTimeout(
        async () => setDoc(doc(db, 'users', uid), { ...dataToSend, lastUpdate: serverTimestamp() }, { merge: true }),
        'flush/write',
        FIRESTORE_TIMEOUT_MS,
      );
    } catch (error) {
      console.error('Error flushing sync to Firestore:', error);
    }
  }
};
