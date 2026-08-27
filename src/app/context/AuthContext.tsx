import { createContext, useContext, useState, type ReactNode } from "react";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

export interface AuthUser {
  id: string;
  name: string | null;
  username?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  authHeader: Record<string, string>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, username?: string) => Promise<void>;
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

  const register = async (name: string, email: string, password: string, username?: string) => {
    const result = await api.post(`${API_BASE}/register`, { name, email, password, username });
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

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  return (
    <AuthContext.Provider value={{ user, token, authHeader, login, register, logout, setUser }}>
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
