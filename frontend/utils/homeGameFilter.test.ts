import { getNextHomeGameFilter, getPreviousHomeGameFilter } from './homeGameFilter';

describe('getNextHomeGameFilter', () => {
  it('cycles home → all', () => {
    expect(getNextHomeGameFilter('home')).toBe('all');
  });

  it('cycles all → away', () => {
    expect(getNextHomeGameFilter('all')).toBe('away');
  });

  it('cycles away → home (wraps around)', () => {
    expect(getNextHomeGameFilter('away')).toBe('home');
  });

  it('falls back to all for an unknown value', () => {
    expect(getNextHomeGameFilter('unknown' as never)).toBe('all');
  });
});

describe('getPreviousHomeGameFilter', () => {
  it('cycles away → all', () => {
    expect(getPreviousHomeGameFilter('away')).toBe('all');
  });

  it('cycles all → home', () => {
    expect(getPreviousHomeGameFilter('all')).toBe('home');
  });

  it('cycles home → away (wraps around)', () => {
    expect(getPreviousHomeGameFilter('home')).toBe('away');
  });

  it('falls back to all for an unknown value', () => {
    expect(getPreviousHomeGameFilter('unknown' as never)).toBe('all');
  });
});
