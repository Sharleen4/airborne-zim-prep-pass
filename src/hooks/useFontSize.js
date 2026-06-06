import { useEffect, useState } from 'react';

// Font size scale options for kids — applied via root font-size scaling
export const FONT_SIZES = {
  normal: { label: 'Normal', scale: 1, emoji: 'A' },
  large: { label: 'Large', scale: 1.15, emoji: 'A' },
  xlarge: { label: 'Extra Large', scale: 1.3, emoji: 'A' },
};

const STORAGE_KEY = 'font-size-preference';

export function useFontSize() {
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window === 'undefined') return 'normal';
    return localStorage.getItem(STORAGE_KEY) || 'normal';
  });

  useEffect(() => {
    const scale = FONT_SIZES[fontSize]?.scale || 1;
    document.documentElement.style.fontSize = `${scale * 100}%`;
  }, [fontSize]);

  const setFontSizePreference = (newSize) => {
    if (!FONT_SIZES[newSize]) return;
    setFontSize(newSize);
    localStorage.setItem(STORAGE_KEY, newSize);
  };

  return { fontSize, setFontSize: setFontSizePreference };
}