import { getScheduleScrollOffset } from './scroll';

describe('getScheduleScrollOffset', () => {
  it('keeps the desktop offset unchanged', () => {
    expect(getScheduleScrollOffset({ isSmallDevice: false, filtersHeaderHeight: 320 })).toBe(320);
  });

  it('adds extra space on mobile when the sticky filters are taller', () => {
    expect(getScheduleScrollOffset({ isSmallDevice: true, filtersHeaderHeight: 240 })).toBe(240);
  });

  it('keeps a minimum offset on mobile', () => {
    expect(getScheduleScrollOffset({ isSmallDevice: true, filtersHeaderHeight: 0 })).toBe(220);
  });
});
