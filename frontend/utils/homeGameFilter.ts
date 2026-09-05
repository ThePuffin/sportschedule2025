import { HomeGameFilter } from '@/components/HomeGameToggle';

const FILTER_ORDER: HomeGameFilter[] = ['home', 'all', 'away'];

/**
 * Returns the next filter in the cycle (home → all → away → home).
 */
export function getNextHomeGameFilter(current: HomeGameFilter): HomeGameFilter {
  const index = FILTER_ORDER.indexOf(current);
  if (index === -1) return 'all';
  return FILTER_ORDER[(index + 1) % FILTER_ORDER.length];
}

/**
 * Returns the previous filter in the cycle (away → all → home → away).
 */
export function getPreviousHomeGameFilter(current: HomeGameFilter): HomeGameFilter {
  const index = FILTER_ORDER.indexOf(current);
  if (index === -1) return 'all';
  return FILTER_ORDER[(index - 1 + FILTER_ORDER.length) % FILTER_ORDER.length];
}
