import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

// Light or dark, in every theme. "device" follows the phone's or computer's
// own setting. The choice is kept in this browser and on the account, each
// with when it was made: on login or a page load the newer one wins.
export const COLOR_MODES = [
  { id: "device", label: "Device" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;

export type ColorMode = (typeof COLOR_MODES)[number]["id"];

const STORAGE_KEY = "naychurrahl_color_mode";
const isMode = (v: unknown): v is ColorMode => COLOR_MODES.some((m) => m.id === v);

type Stored = { mode: ColorMode; at: number };

function readStored(): Stored | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return v && isMode(v.mode) ? { mode: v.mode, at: Number(v.at) || 0 } : null;
  } catch {
    return null;
  }
}

function store(s: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Blocked storage: the choice lasts this visit (and the account, if any).
  }
}

function useDeviceDark(): boolean {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const apply = () => setDark(media.matches);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return dark;
}

interface ColorModeValue {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  // What's showing: the mode, with "device" worked out.
  dark: boolean;
}

const ColorModeContext = createContext<ColorModeValue | null>(null);

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const { user, authHeader } = useAuth();
  const [state, setState] = useState<Stored>(() => readStored() ?? { mode: "device", at: 0 });
  const deviceDark = useDeviceDark();

  const keep = (s: Stored) => { setState(s); store(s); };
  // The account's time for the choice, so both sides compare the same clock.
  const saveToAccount = (mode: ColorMode) =>
    api.put(`${API_BASE}/profile`, { colorMode: mode }, { headers: authHeader })
      .then((p: { colorModeAt?: string | null }) => {
        const at = p.colorModeAt ? Date.parse(p.colorModeAt) : 0;
        if (at) store({ mode, at });
      })
      .catch(() => {});

  // At login and on each page load: whichever choice was made last wins.
  useEffect(() => {
    if (!user) return;
    let live = true;
    api.get(`${API_BASE}/profile`, { headers: authHeader })
      .then((p: { colorMode?: string | null; colorModeAt?: string | null }) => {
        if (!live) return;
        const here = readStored();
        const accountAt = p.colorModeAt ? Date.parse(p.colorModeAt) : 0;
        if (isMode(p.colorMode) && accountAt >= (here?.at ?? 0)) {
          keep({ mode: p.colorMode, at: accountAt });
        } else if (here) {
          void saveToAccount(here.mode);
        }
      })
      .catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setMode = (mode: ColorMode) => {
    keep({ mode, at: Date.now() });
    if (user) void saveToAccount(mode);
  };

  const value: ColorModeValue = { mode: state.mode, setMode, dark: state.mode === "dark" || (state.mode === "device" && deviceDark) };
  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export function useColorMode(): ColorModeValue {
  const context = useContext(ColorModeContext);
  if (!context) throw new Error("useColorMode must be used within a ColorModeProvider");
  return context;
}

// Puts `dark` on <html> while the store is showing (not the shop workspace,
// which has its own look), so pieces rendered outside the page match too.
export function useApplyColorMode() {
  const { dark } = useColorMode();
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    return () => root.classList.remove("dark");
  }, [dark]);
}
