import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getCache } from '@/utils/fetchData';
import { useEffect, useState } from 'react';

export function useFavoriteColor(defaultColor: string = '#3b82f6') {
  const theme = useColorScheme() ?? 'light';
  const [backgroundColor, setBackgroundColor] = useState(defaultColor);
  const [textColor, setTextColor] = useState('#FFFFFF');

  const getBrightness = (color: string) => {
    if (!color) return 0;
    let hex = color.replace(/#/g, '');
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('');
    }
    const r = Number.parseInt(hex.substring(0, 2), 16);
    const g = Number.parseInt(hex.substring(2, 4), 16);
    const b = Number.parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  };

  const getTextColorForBackground = (bgColor: string) => {
    const brightness = getBrightness(bgColor);
    return brightness > 128 ? '#000000' : '#FFFFFF';
  };

  useEffect(() => {
    const updateColor = () => {
      const favoriteTeams = getCache<string[]>('favoriteTeams');
      if (favoriteTeams && favoriteTeams.length > 0) {
        const firstFav = favoriteTeams[0];
        const teamData = (Colors as any)[firstFav];

        if (teamData) {
          const { color, backgroundColor: teamBg } = teamData;
          const b1 = getBrightness(color);
          const b2 = getBrightness(teamBg);

          let finalColor;
          if (theme === 'light') {
            // Darkest
            finalColor = b1 < b2 ? color : teamBg;
          } else {
            // Lightest
            finalColor = b1 > b2 ? color : teamBg;
          }

          finalColor = finalColor || defaultColor;
          setBackgroundColor(finalColor);
          setTextColor(getTextColorForBackground(finalColor));
        } else {
          setBackgroundColor(defaultColor);
          setTextColor(getTextColorForBackground(defaultColor));
        }
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
  }, [defaultColor, theme]);

  return { backgroundColor, textColor };
}
