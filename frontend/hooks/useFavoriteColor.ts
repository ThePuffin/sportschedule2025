import { Colors } from '@/constants/Colors';
import { getCache } from '@/utils/fetchData';
import { useEffect, useState } from 'react';

export function useFavoriteColor(defaultColor: string = '#3b82f6') {
  const [backgroundColor, setBackgroundColor] = useState(defaultColor);
  const [textColor, setTextColor] = useState('#FFFFFF');

  const getTextColorForBackground = (bgColor: string) => {
    if (!bgColor) return '#FFFFFF';
    let hex = bgColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  };

  useEffect(() => {
    const updateColor = () => {
      const favoriteTeams = getCache<string[]>('favoriteTeams');
      if (favoriteTeams && favoriteTeams.length > 0) {
        const firstFav = favoriteTeams[0];
        const teamColor = (Colors as any)[firstFav]?.backgroundColor;
        const finalColor = teamColor || defaultColor;
        setBackgroundColor(finalColor);
        setTextColor(getTextColorForBackground(finalColor));
      } else {
        setBackgroundColor(defaultColor);
        setTextColor(getTextColorForBackground(defaultColor));
      }
    };
    updateColor();
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('favoritesUpdated', updateColor);
      return () => globalThis.window.removeEventListener('favoritesUpdated', updateColor);
    }
  }, [defaultColor]);

  return { backgroundColor, textColor };
}
