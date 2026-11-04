import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { useShopMode } from "../context/ShopModeContext";

export const THEMES = [
  { id: "marketplace", label: "Marketplace" },
  { id: "modern", label: "Modern" },
  { id: "classic", label: "Classic" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "marketplace";

const STORAGE_KEY = "naychurrahl_theme";
const isTheme = (value: unknown): value is ThemeId => THEMES.some((t) => t.id === value);

function readStored(): ThemeId | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

function store(theme: ThemeId) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Blocked storage: the choice lasts this visit (and the account, if any).
  }
}

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  // On a merchant's own domain the theme is fixed and there's no switcher.
  locked: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, authHeader } = useAuth();
  const { shop } = useShopMode();
  const [chosen, setChosen] = useState<ThemeId | null>(readStored);
  // A pick made while the account's answer is on its way must not be undone by it.
  const pickedSinceLoad = useRef(false);

  // At login and on each page load: the account's choice wins; an account with
  // none takes the one this browser already has.
  useEffect(() => {
    if (!user || shop) return;
    let live = true;
    api.get(`${API_BASE}/profile`, { headers: authHeader })
      .then((profile: { storeTheme?: string | null }) => {
        if (!live || pickedSinceLoad.current) return;
        if (isTheme(profile.storeTheme)) {
          setChosen(profile.storeTheme);
          store(profile.storeTheme);
          return;
        }
        const here = readStored();
        if (here) api.put(`${API_BASE}/profile`, { storeTheme: here }, { headers: authHeader }).catch(() => {});
      })
      .catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, shop]);

  const setTheme = (next: ThemeId) => {
    pickedSinceLoad.current = true;
    setChosen(next);
    store(next);
    if (user) {
      api.put(`${API_BASE}/profile`, { storeTheme: next }, { headers: authHeader })
        .catch(() => toast.error("Theme changed on this device, but we couldn't save it to your account."));
    }
  };

  const value: ThemeContextValue = shop
    ? { theme: "classic", setTheme, locked: true }
    : { theme: chosen ?? DEFAULT_THEME, setTheme, locked: false };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
