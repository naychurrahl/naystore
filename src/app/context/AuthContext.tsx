import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { setInsightToken } from "../utils/insights";
import { toast } from "sonner";
import { api, setUnauthorizedHandler } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

// A store the person owns or works in, and what their role there can do
// (view, products, orders, chat, delivery, coupons, promotions, services,
// insights, shop, reviews, money, team).
export interface StoreRef {
  id: string;
  name: string;
  slug: string | null;
  role: "owner" | "manager" | "staff";
  active: boolean;
  can: string[];
}

export interface AuthUser {
  id: string;
  name: string | null;
  legalName?: string | null;
  legalNameLocked?: boolean;
  username?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  area?: string | null;
  landmark?: string | null;
  state?: string | null;
  lga?: string | null;
  role: string;
  stores?: StoreRef[];
}

export interface RegisterInput {
  usertype: "customer" | "merchant";
  name: string;
  legalName?: string;
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
  // The code emailed by POST register/code.
  code: string;
  // A friend's invite code (optional).
  referralCode?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  authHeader: Record<string, string>;
  login: (identifier: string, password: string) => Promise<void>;
  // Resolves to a note to show, if the server sent one (e.g. an invite code
  // that wasn't applied).
  register: (data: RegisterInput) => Promise<string | undefined>;
  becomeMerchant: (commissionType: "category" | "percentage" | "flat", commissionRate: number, fulfillmentMethod: "fbu" | "fbm", location: string, state: string, lga: string, area: string, landmark: string, shopName: string, legalName: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  // The store the seller is working in (sent with every request as
  // X-Store-Id), and switching it.
  store: StoreRef | null;
  stores: StoreRef[];
  setStoreId: (id: string) => void;
  // Whether their role in the current store allows this.
  can: (what: string) => boolean;
  refreshStores: () => Promise<StoreRef[]>;
}

const STORAGE_KEY = "naychurrahl_auth";
const STORE_KEY = "naychurrahl_store";

function readStoreId(): string | null {
  try {
    return localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

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
  const [storeId, setStoreIdState] = useState<string | null>(readStoreId);

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
    return result.notice as string | undefined;
  };

  // Upgrades the current customer's own account to a merchant in place -
  // same login/email going forward, no new account.
  const becomeMerchant = async (commissionType: "category" | "percentage" | "flat", commissionRate: number, fulfillmentMethod: "fbu" | "fbm", location: string, state: string, lga: string, area: string, landmark: string, shopName: string, legalName: string, phone: string) => {
    const result = await api.put(`${API_BASE}/become-merchant`, { commissionType, commissionRate, fulfillmentMethod, location, state, lga, area, landmark, shopName, legalName, phone }, { headers: authHeader });
    persist({ user: result.user, token: result.token });
    if (result.storeId) setStoreId(result.storeId);
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

  // Keeps the store list the person already has when a profile save
  // answers without one.
  const setUser = (nextUser: AuthUser) => {
    persist({ user: { ...nextUser, stores: nextUser.stores ?? user?.stores }, token });
  };

  const setStoreId = (id: string) => {
    setStoreIdState(id);
    try {
      localStorage.setItem(STORE_KEY, id);
    } catch {
      // Blocked storage: the choice lasts this visit.
    }
  };

  const stores = user?.stores ?? [];
  const store = stores.find((s) => s.id === storeId) ?? stores[0] ?? null;
  const can = (what: string) => !!store?.can.includes(what);

  const refreshStores = async (): Promise<StoreRef[]> => {
    if (!token) return [];
    const r = await api.get(`${API_BASE}/my-stores`, { headers: { Authorization: `Bearer ${token}` } });
    const next = (r.stores ?? []) as StoreRef[];
    setState((prev) => {
      if (!prev.user) return prev;
      const role = next.length ? "merchant" : prev.user.role === "merchant" ? "customer" : prev.user.role;
      const updated = { user: { ...prev.user, stores: next, role }, token: prev.token };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* blocked storage */ }
      return updated;
    });
    return next;
  };

  // A seller's stores, once per visit (a session saved before stores
  // existed has none listed; the team may have changed since).
  useEffect(() => {
    if (user?.role === "merchant") void refreshStores().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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

  const authHeader: Record<string, string> = token
    ? { Authorization: `Bearer ${token}`, ...(store ? { "X-Store-Id": store.id } : {}) }
    : {};
  useEffect(() => setInsightToken(token), [token]);

  return (
    <AuthContext.Provider value={{ user, token, authHeader, login, register, becomeMerchant, logout, setUser, store, stores, setStoreId, can, refreshStores }}>
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
