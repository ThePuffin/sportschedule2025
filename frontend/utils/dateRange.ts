import { fetchDateRangeFromApi, getCache, saveCache } from './fetchData';

/**
 * Builds the cache key for date-range limits. Leagues are joined with `+`,
 * uppercased and stripped of non-alphanumeric characters before being appended
 * to the base `dateRangeLimits` key, so `['NHL']` → `dateRangeLimits_NHL` and no
 * leagues → the global `dateRangeLimits` key.
 */
const limitsCacheKey = (leagues?: string[]): string => {
  if (!leagues || leagues.length === 0) return 'dateRangeLimits';
  const scope = leagues
    .join('+')
    .toUpperCase()
    .replace(/[^A-Z0-9+]/g, '');
  return `dateRangeLimits_${scope}`;
};

export const getDateRangeLimits = (leagues?: string[]) => {
  const cached = getCache<{ minDate: string; maxDate: string }>(limitsCacheKey(leagues));
  if (cached) {
    return { minDate: new Date(cached.minDate), maxDate: new Date(cached.maxDate) };
  }

  const today = new Date();
  const minDate = new Date(today);
  minDate.setMonth(today.getMonth() - 6);
  const maxDate = new Date(today);
  maxDate.setMonth(today.getMonth() + 6);
  return { minDate, maxDate };
};

export const fetchDateRangeLimits = async (leagues?: string[], force = false) => {
  try {
    const data = await fetchDateRangeFromApi(leagues, force);
    if (data.minDate && data.maxDate) {
      const limits = { minDate: new Date(data.minDate), maxDate: new Date(data.maxDate) };
      saveCache(limitsCacheKey(leagues), limits);
      return limits;
    }
  } catch (error) {
    console.error('Error fetching date range:', error);
  }
  return getDateRangeLimits(leagues);
};
