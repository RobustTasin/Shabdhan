"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark";

type AppearanceContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);
const THEME_STORAGE_KEY = "shabdhan-feed-theme";

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "light" || savedTheme === "dark") {
        setThemeState(savedTheme);
      }
    } catch {
      // Keep the default if browser storage is unavailable.
    }
    setLoaded(true);
  }, []);

  useLayoutEffect(() => {
    if (!loaded) return;
    document.documentElement.dataset.siteTheme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The selected theme still applies for this visit.
    }
  }, [loaded, theme]);

  const setTheme = useCallback((nextTheme: Theme) => setThemeState(nextTheme), []);
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }
  return context;
}
