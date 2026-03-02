import { fetchDateRangeFromApi, getCache, saveCache } from './fetchData';

export const getDateRangeLimits = () => {
  const cached = getCache<{ minDate: string; maxDate: string }>('dateRangeLimits');
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

export const fetchDateRangeLimits = async () => {
  try {
    const data = await fetchDateRangeFromApi();
    if (data.minDate && data.maxDate) {
      const limits = { minDate: new Date(data.minDate), maxDate: new Date(data.maxDate) };
      saveCache('dateRangeLimits', limits);
      return limits;
    }
  } catch (error) {
    console.error('Error fetching date range:', error);
  }
  return getDateRangeLimits();
};
