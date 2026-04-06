import React, { createContext, useContext, useMemo } from 'react';
import { lightColors, type Colors } from '../utils/colors';

interface ThemeContextType {
  colors: Colors;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export const useColors = (): Colors => {
  return useTheme().colors;
};

export function useThemedStyles<T>(factory: (c: Colors) => T): T {
  const c = useColors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(c), [c]);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colors = lightColors;
  const value = useMemo(() => ({ colors }), []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
