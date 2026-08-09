import {
  applyFirestoreDataToLocal,
  DEFAULT_DEBOUNCE_MS,
  fetchUserDataFromFirestore,
  flushSync,
  hasFirestoreData,
  pushLocalDataToFirestore,
  readLocalData,
  syncOnLogin,
  syncToFirestore,
} from './syncService';

// --- Mocks ---
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockDoc = jest.fn((db: unknown, collection: string, id: string) => ({ db, collection, id }));
const mockServerTimestamp = jest.fn(() => ({ __serverTimestamp: true }));

jest.mock('firebase/firestore', () => ({
  doc: (...args: [unknown, string, string]) => mockDoc(...args),
  getDoc: (...args: [unknown]) => mockGetDoc(...args),
  setDoc: (...args: [unknown, unknown, unknown]) => mockSetDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

jest.mock('./firebaseConfig', () => ({
  db: { mockDb: true },
}));

// Mock fetchData's saveCache/getCache to use a simple in-memory store
const mockMemoryStore = new Map<string, string>();
jest.mock('./fetchData', () => ({
  saveCache: (key: string, data: unknown) => {
    mockMemoryStore.set(key, JSON.stringify(data));
  },
  getCache: <T>(key: string): T | null => {
    const raw = mockMemoryStore.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
}));

// --- localStorage mock ---
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const localStorageMock = new LocalStorageMock();

beforeEach(() => {
  jest.clearAllMocks();
  mockMemoryStore.clear();
  localStorageMock.clear();
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
  // Reset module-level debounce state by flushing
  return flushSync();
});

describe('readLocalData', () => {
  it('reads all user-preference data from localStorage/cache', () => {
    mockMemoryStore.set('favoriteTeams', JSON.stringify(['NFL-SF']));
    mockMemoryStore.set('leaguesSelected', JSON.stringify(['NFL']));
    mockMemoryStore.set('showScores', JSON.stringify(true));
    mockMemoryStore.set('showPreviousScores', JSON.stringify(false));
    mockMemoryStore.set('gameSelected', JSON.stringify([{ uniqueId: 'g1' }]));
    mockMemoryStore.set('teamsSelected', JSON.stringify([{ uniqueId: 'NFL-SF' }, { uniqueId: 'NFL-KC' }]));
    mockMemoryStore.set('teamsSelectedLeagues', JSON.stringify({ NFL: 'NFL-SF' }));
    localStorageMock.setItem('startDate', '2026-01-01');
    localStorageMock.setItem('endDate', '2026-01-15');
    localStorageMock.setItem('teamSelected', 'NFL-SF');
    localStorageMock.setItem('leagueSelected', 'NFL');

    const data = readLocalData();

    expect(data.favoriteTeams).toEqual(['NFL-SF']);
    expect(data.leaguesSelected).toEqual(['NFL']);
    expect(data.showScores).toBe(true);
    expect(data.showPreviousScores).toBe(false);
    expect(data.gameSelected).toEqual([{ uniqueId: 'g1' }]);
    expect(data.teamsSelected).toEqual(['NFL-SF', 'NFL-KC']);
    expect(data.teamsSelectedLeagues).toEqual({ NFL: 'NFL-SF' });
    expect(data.startDate).toBe('2026-01-01');
    expect(data.endDate).toBe('2026-01-15');
    expect(data.teamSelected).toBe('NFL-SF');
    expect(data.leagueSelected).toBe('NFL');
  });

  it('returns empty defaults when nothing is stored', () => {
    const data = readLocalData();
    expect(data.favoriteTeams).toEqual([]);
    expect(data.leaguesSelected).toEqual([]);
    expect(data.showScores).toBe(false);
    expect(data.showPreviousScores).toBe(false);
    expect(data.gameSelected).toEqual([]);
    expect(data.teamsSelected).toEqual([]);
    expect(data.teamsSelectedLeagues).toEqual({});
    expect(data.startDate).toBeNull();
    expect(data.endDate).toBeNull();
    expect(data.teamSelected).toBeNull();
    expect(data.leagueSelected).toBeNull();
  });
});

describe('applyFirestoreDataToLocal', () => {
  it('overwrites localStorage with Firestore data', () => {
    mockMemoryStore.set('favoriteTeams', JSON.stringify(['OLD']));
    localStorageMock.setItem('teamSelected', 'OLD-TEAM');

    applyFirestoreDataToLocal({
      favoriteTeams: ['NFL-SF'],
      leaguesSelected: ['NFL'],
      showScores: true,
      showPreviousScores: true,
      gameSelected: [{ uniqueId: 'g1' }],
      teamsSelectedLeagues: { NFL: 'NFL-SF' },
      teamSelected: 'NFL-SF',
      leagueSelected: 'NFL',
      startDate: '2026-01-01',
      endDate: '2026-01-15',
    });

    expect(JSON.parse(mockMemoryStore.get('favoriteTeams')!)).toEqual(['NFL-SF']);
    expect(JSON.parse(mockMemoryStore.get('leaguesSelected')!)).toEqual(['NFL']);
    expect(JSON.parse(mockMemoryStore.get('showScores')!)).toBe(true);
    expect(JSON.parse(mockMemoryStore.get('showPreviousScores')!)).toBe(true);
    expect(JSON.parse(mockMemoryStore.get('gameSelected')!)).toEqual([{ uniqueId: 'g1' }]);
    expect(JSON.parse(mockMemoryStore.get('teamsSelectedLeagues')!)).toEqual({ NFL: 'NFL-SF' });
    expect(localStorageMock.getItem('teamSelected')).toBe('NFL-SF');
    expect(localStorageMock.getItem('leagueSelected')).toBe('NFL');
    expect(localStorageMock.getItem('startDate')).toBe('2026-01-01');
    expect(localStorageMock.getItem('endDate')).toBe('2026-01-15');
  });

  it('uses empty defaults for missing fields', () => {
    applyFirestoreDataToLocal({});
    expect(JSON.parse(mockMemoryStore.get('favoriteTeams')!)).toEqual([]);
    expect(JSON.parse(mockMemoryStore.get('leaguesSelected')!)).toEqual([]);
    expect(JSON.parse(mockMemoryStore.get('showScores')!)).toBe(false);
    expect(JSON.parse(mockMemoryStore.get('showPreviousScores')!)).toBe(false);
    expect(JSON.parse(mockMemoryStore.get('gameSelected')!)).toEqual([]);
  });
});

describe('hasFirestoreData', () => {
  it('returns true when meaningful data exists', () => {
    expect(hasFirestoreData({ favoriteTeams: ['NFL-SF'] })).toBe(true);
    expect(hasFirestoreData({ leaguesSelected: ['NFL'] })).toBe(true);
    expect(hasFirestoreData({ showScores: true })).toBe(true);
    expect(hasFirestoreData({ showPreviousScores: false })).toBe(true);
    expect(hasFirestoreData({ gameSelected: [{ uniqueId: 'g1' }] })).toBe(true);
    expect(hasFirestoreData({ teamsSelectedLeagues: { NFL: 'NFL-SF' } })).toBe(true);
  });

  it('returns false for empty / profile-only documents', () => {
    expect(hasFirestoreData({})).toBe(false);
    expect(hasFirestoreData({ favoriteTeams: [] })).toBe(false);
    expect(hasFirestoreData({ leaguesSelected: [] })).toBe(false);
    expect(hasFirestoreData({ gameSelected: [] })).toBe(false);
    expect(hasFirestoreData({ teamsSelectedLeagues: {} })).toBe(false);
    expect(hasFirestoreData({ lastLogin: { __serverTimestamp: true } } as never)).toBe(false);
  });
});

describe('fetchUserDataFromFirestore', () => {
  it('returns document data when the document exists', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ favoriteTeams: ['NFL-SF'] }) });

    const data = await fetchUserDataFromFirestore('user-1');

    expect(data).toEqual({ favoriteTeams: ['NFL-SF'] });
    expect(mockDoc).toHaveBeenCalledWith({ mockDb: true }, 'users', 'user-1');
  });

  it('returns null when the document does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => undefined });

    const data = await fetchUserDataFromFirestore('user-1');

    expect(data).toBeNull();
  });

  it('throws on network error so callers can fall back to local data', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('offline'));

    await expect(fetchUserDataFromFirestore('user-1')).rejects.toThrow('offline');
  });

  it('surfaces a timeout-based failure back to the login fallback branch', async () => {
    mockGetDoc.mockImplementationOnce(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 20)),
    );

    await expect(fetchUserDataFromFirestore('user-1')).rejects.toThrow();
  });
});

describe('pushLocalDataToFirestore', () => {
  it('writes current localStorage data to the user document', async () => {
    mockMemoryStore.set('favoriteTeams', JSON.stringify(['NFL-SF']));
    localStorageMock.setItem('teamSelected', 'NFL-SF');

    await pushLocalDataToFirestore('user-1');

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [ref, payload, options] = mockSetDoc.mock.calls[0];
    expect(ref).toEqual({ db: { mockDb: true }, collection: 'users', id: 'user-1' });
    expect(payload.favoriteTeams).toEqual(['NFL-SF']);
    expect(payload.teamSelected).toBe('NFL-SF');
    expect(payload.lastLogin).toEqual({ __serverTimestamp: true });
    expect(options).toEqual({ merge: true });
  });

  it('propagates errors to the caller', async () => {
    mockSetDoc.mockRejectedValueOnce(new Error('offline'));

    await expect(pushLocalDataToFirestore('user-1')).rejects.toThrow('offline');
  });
});

describe('syncOnLogin', () => {
  it('returns "firestore" and overwrites local data when Firestore has data', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ favoriteTeams: ['NFL-SF'], leaguesSelected: ['NFL'] }),
    });
    mockMemoryStore.set('favoriteTeams', JSON.stringify(['OLD']));

    const result = await syncOnLogin('user-1');

    expect(result).toBe('firestore');
    expect(JSON.parse(mockMemoryStore.get('favoriteTeams')!)).toEqual(['NFL-SF']);
    expect(JSON.parse(mockMemoryStore.get('leaguesSelected')!)).toEqual(['NFL']);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('returns "local" and pushes local data when Firestore has no data', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => undefined });
    mockMemoryStore.set('favoriteTeams', JSON.stringify(['NFL-SF']));

    const result = await syncOnLogin('user-1');

    expect(result).toBe('local');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = mockSetDoc.mock.calls[0];
    expect(ref).toEqual({ db: { mockDb: true }, collection: 'users', id: 'user-1' });
    expect(payload.favoriteTeams).toEqual(['NFL-SF']);
  });

  it('returns "local" and pushes local data when Firestore document is empty (profile only)', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ lastLogin: { __serverTimestamp: true } }),
    });
    mockMemoryStore.set('favoriteTeams', JSON.stringify(['NFL-SF']));

    const result = await syncOnLogin('user-1');

    expect(result).toBe('local');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('returns "error" and keeps local data when Firestore fails', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('network timeout'));
    mockMemoryStore.set('favoriteTeams', JSON.stringify(['NFL-SF']));

    const result = await syncOnLogin('user-1');

    expect(result).toBe('error');
    // Local data untouched
    expect(JSON.parse(mockMemoryStore.get('favoriteTeams')!)).toEqual(['NFL-SF']);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('syncToFirestore (debounced writes)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does nothing when no user is provided', () => {
    syncToFirestore('', { favoriteTeams: ['NFL-SF'] });
    jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS + 100);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('writes to Firestore after the debounce delay', () => {
    syncToFirestore('user-1', { favoriteTeams: ['NFL-SF'] });

    expect(mockSetDoc).not.toHaveBeenCalled();

    jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS + 100);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [ref, payload, options] = mockSetDoc.mock.calls[0];
    expect(ref).toEqual({ db: { mockDb: true }, collection: 'users', id: 'user-1' });
    expect(payload.favoriteTeams).toEqual(['NFL-SF']);
    expect(payload.lastUpdate).toEqual({ __serverTimestamp: true });
    expect(options).toEqual({ merge: true });
  });

  it('merges rapid successive writes into a single Firestore call', () => {
    syncToFirestore('user-1', { favoriteTeams: ['NFL-SF'] });
    jest.advanceTimersByTime(200);
    syncToFirestore('user-1', { leaguesSelected: ['NFL'] });
    jest.advanceTimersByTime(200);
    syncToFirestore('user-1', { showScores: true });

    // No call yet
    expect(mockSetDoc).not.toHaveBeenCalled();

    jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS + 100);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = mockSetDoc.mock.calls[0];
    expect(payload.favoriteTeams).toEqual(['NFL-SF']);
    expect(payload.leaguesSelected).toEqual(['NFL']);
    expect(payload.showScores).toBe(true);
  });

  it('handles Firestore write errors gracefully (does not throw)', () => {
    mockSetDoc.mockRejectedValueOnce(new Error('offline'));

    expect(() => syncToFirestore('user-1', { favoriteTeams: ['NFL-SF'] })).not.toThrow();

    jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS + 100);

    // The promise rejection is caught internally; no unhandled rejection
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });
});

describe('flushSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('flushes pending debounced writes immediately', async () => {
    syncToFirestore('user-1', { favoriteTeams: ['NFL-SF'] });

    // No call before debounce elapses
    expect(mockSetDoc).not.toHaveBeenCalled();

    await flushSync();

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = mockSetDoc.mock.calls[0];
    expect(ref).toEqual({ db: { mockDb: true }, collection: 'users', id: 'user-1' });
    expect(payload.favoriteTeams).toEqual(['NFL-SF']);
  });

  it('does nothing when there is no pending data', async () => {
    await flushSync();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('handles flush errors gracefully', async () => {
    syncToFirestore('user-1', { favoriteTeams: ['NFL-SF'] });
    mockSetDoc.mockRejectedValueOnce(new Error('offline'));

    await expect(flushSync()).resolves.toBeUndefined();
  });
});
