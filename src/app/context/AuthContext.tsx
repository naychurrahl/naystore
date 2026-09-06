import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { api, setUnauthorizedHandler } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

export interface AuthUser {
  id: string;
  name: string | null;
  username?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  area?: string | null;
  landmark?: string | null;
  state?: string | null;
  lga?: string | null;
  role: string;
}

export interface RegisterInput {
  usertype: "customer" | "merchant";
  name: string;
  email: string;
  password: string;
  username?: string;
  location?: string;
  state?: string;
  lga?: string;
  area?: string;
  landmark?: string;
  commissionType?: "percentage" | "flat";
  commissionRate?: number;
  fulfillmentMethod?: "fbu" | "fbm";
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  authHeader: Record<string, string>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  becomeMerchant: (commissionType: "percentage" | "flat", commissionRate: number, fulfillmentMethod: "fbu" | "fbm", location: string, state: string, lga: string, area: string, landmark: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

const STORAGE_KEY = "naychurrahl_auth";

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): { user: AuthUser | null; token: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { user: null, token: null };
  } catch {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ user, token }, setState] = useState(() => readStoredAuth());

  const persist = (next: { user: AuthUser | null; token: string | null }) => {
    setState(next);
    if (next.user && next.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const login = async (identifier: string, password: string) => {
    // Wire key stays "email" for backend compatibility - the backend now
    // matches it against either email or username.
    const result = await api.post(`${API_BASE}/auth`, { email: identifier, password });
    persist({ user: result.user, token: result.token });
  };

  const register = async (data: RegisterInput) => {
    const result = await api.post(`${API_BASE}/register`, data);
    persist({ user: result.user, token: result.token });
  };

  // Upgrades the current customer's own account to a merchant in place -
  // same login/email going forward, no new account.
  const becomeMerchant = async (commissionType: "percentage" | "flat", commissionRate: number, fulfillmentMethod: "fbu" | "fbm", location: string, state: string, lga: string, area: string, landmark: string) => {
    const result = await api.put(`${API_BASE}/become-merchant`, { commissionType, commissionRate, fulfillmentMethod, location, state, lga, area, landmark }, { headers: authHeader });
    persist({ user: result.user, token: result.token });
  };

  const logout = async () => {
    if (token) {
      try {
        await api.delete(`${API_BASE}/auth`, { headers: { Authorization: `Bearer ${token}` } });
      } catch {
        // Best-effort revocation - clear local state regardless.
      }
    }
    persist({ user: null, token: null });
  };

  const setUser = (nextUser: AuthUser) => {
    persist({ user: nextUser, token });
  };

  // A 401 on any request means the token is missing/invalid/expired (never a
  // role mismatch - that's 403), so it's always safe to clear the session
  // here. tokenRef (not the `token` closed over at mount) lets the handler
  // see the current session without re-registering on every token change.
  // Pages already fall back to a guest view when user/token are null (see
  // e.g. Profile.tsx), so no forced redirect is needed here.
  const tokenRef = useRef(token);
  tokenRef.current = token;

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (tokenRef.current) {
        persist({ user: null, token: null });
        toast.error("Your session has expired. Please log in again.");
      }
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  return (
    <AuthContext.Provider value={{ user, token, authHeader, login, register, becomeMerchant, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
