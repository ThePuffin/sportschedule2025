import { fetchDateRangeLimits, getDateRangeLimits } from './dateRange';

// --- Mocks (in-memory stand-ins for fetchData's cache + fetch) ---
const mockMemoryStore = new Map<string, string>();
const mockFetchDateRangeFromApi = jest.fn();

const mockSaveCache = (key: string, data: unknown) => {
  mockMemoryStore.set(key, JSON.stringify(data));
};

jest.mock('./fetchData', () => ({
  saveCache: (key: string, data: unknown) => mockSaveCache(key, data),
  getCache: <T>(key: string): T | null => {
    const raw = mockMemoryStore.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  fetchDateRangeFromApi: (...args: unknown[]) =>
    mockFetchDateRangeFromApi(...args),
}));

const MONTH_MS = 1000 * 60 * 60 * 24 * 30;

describe('dateRange', () => {
  beforeEach(() => {
    mockMemoryStore.clear();
    mockFetchDateRangeFromApi.mockReset();
  });

  describe('getDateRangeLimits', () => {
    it('returns a ±6 month fallback when nothing is cached', () => {
      const { minDate, maxDate } = getDateRangeLimits();
      const now = Date.now();

      expect(minDate.getTime()).toBeLessThan(now);
      expect(maxDate.getTime()).toBeGreaterThan(now);

      const spanMonths = (maxDate.getTime() - minDate.getTime()) / MONTH_MS;
      // ~12 months total (minDate today-6mo, maxDate today+6mo)
      expect(spanMonths).toBeGreaterThan(10);
      expect(spanMonths).toBeLessThan(13);
    });

    it('returns cached limits from the (plain) cache key', () => {
      mockSaveCache('dateRangeLimits', {
        minDate: '2025-01-01',
        maxDate: '2025-12-31',
      });

      const { minDate, maxDate } = getDateRangeLimits();

      expect(minDate).toEqual(new Date('2025-01-01'));
      expect(maxDate).toEqual(new Date('2025-12-31'));
    });

    it('uses a league-scoped cache key so leagues do not leak into each other', () => {
      mockSaveCache('dateRangeLimits_NHL', {
        minDate: '2025-01-01',
        maxDate: '2025-12-31',
      });

      // NHL scoped → reads its own entry
      const nhl = getDateRangeLimits(['NHL']);
      expect(nhl.minDate).toEqual(new Date('2025-01-01'));

      // NBA scoped → no entry → falls back to the ±6 month window
      const nba = getDateRangeLimits(['NBA']);
      expect(nba.minDate.getTime()).toBeLessThan(Date.now());
      expect(nba.maxDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('fetchDateRangeLimits', () => {
    it('fetches, converts to Date and caches under a league-scoped key', async () => {
      mockFetchDateRangeFromApi.mockResolvedValueOnce({
        minDate: '2025-03-01',
        maxDate: '2025-09-30',
      });

      const result = await fetchDateRangeLimits(['PWHL']);

      expect(mockFetchDateRangeFromApi).toHaveBeenCalledWith(['PWHL'], false);
      expect(result.minDate).toEqual(new Date('2025-03-01'));
      expect(result.maxDate).toEqual(new Date('2025-09-30'));
      // now served from the scoped cache without another fetch
      const cached = getDateRangeLimits(['PWHL']);
      expect(cached.minDate).toEqual(new Date('2025-03-01'));
    });

    it('forwards the force flag to bypass the API cache', async () => {
      mockFetchDateRangeFromApi.mockResolvedValue({
        minDate: '2025-03-01',
        maxDate: '2025-09-30',
      });

      await fetchDateRangeLimits(['NHL'], true);
      expect(mockFetchDateRangeFromApi).toHaveBeenCalledWith(['NHL'], true);

      await fetchDateRangeLimits(['NBA']);
      expect(mockFetchDateRangeFromApi).toHaveBeenLastCalledWith(['NBA'], false);
    });

    it('falls back to getDateRangeLimits when the API returns no dates', async () => {
      mockFetchDateRangeFromApi.mockResolvedValueOnce({
        minDate: null,
        maxDate: null,
      });

      const result = await fetchDateRangeLimits();

      const now = Date.now();
      expect(result.minDate.getTime()).toBeLessThan(now);
      expect(result.maxDate.getTime()).toBeGreaterThan(now);
    });

    it('falls back to getDateRangeLimits when the API call throws', async () => {
      mockFetchDateRangeFromApi.mockRejectedValueOnce(new Error('network down'));

      const result = await fetchDateRangeLimits(['NHL']);

      const now = Date.now();
      expect(result.minDate.getTime()).toBeLessThan(now);
      expect(result.maxDate.getTime()).toBeGreaterThan(now);
    });
  });
});