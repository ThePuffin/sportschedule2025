import React, { createContext, useContext, useMemo, useState } from 'react';

interface HorizontalScrollContextType {
  isScrollingHorizontally: boolean;
  setIsScrollingHorizontally: (value: boolean) => void;
}

const HorizontalScrollContext = createContext<HorizontalScrollContextType | undefined>(undefined);

export const HorizontalScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isScrollingHorizontally, setIsScrollingHorizontally] = useState(false);

  const value = useMemo(() => ({ isScrollingHorizontally, setIsScrollingHorizontally }), [isScrollingHorizontally]);

  return <HorizontalScrollContext.Provider value={value}>{children}</HorizontalScrollContext.Provider>;
};

export const useHorizontalScroll = () => {
  const context = useContext(HorizontalScrollContext);

  // Return a no-op context if provider doesn't exist (for pages without HorizontalScrollProvider)
  if (!context) {
    return {
      isScrollingHorizontally: false,
      setIsScrollingHorizontally: () => {},
    };
  }

  return context;
};
