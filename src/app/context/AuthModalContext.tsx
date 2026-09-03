import { createContext, useContext, useState, type ReactNode } from "react";

type AuthModalMode = "login" | "register";
type Usertype = "customer" | "merchant";

interface AuthModalContextValue {
  isOpen: boolean;
  mode: AuthModalMode;
  redirectTo: string | null;
  defaultUsertype: Usertype;
  openLogin: (redirectTo?: string, defaultUsertype?: Usertype) => void;
  openRegister: (redirectTo?: string, defaultUsertype?: Usertype) => void;
  switchMode: (mode: AuthModalMode) => void;
  close: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

// Global so it can be triggered from anywhere - including routes that sit
// outside the storefront Layout tree, like MerchantProtectedRoute - and
// renders once at the App root so it can cover whatever page is underneath.
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>("login");
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [defaultUsertype, setDefaultUsertype] = useState<Usertype>("customer");

  const openLogin = (nextRedirectTo?: string, usertype?: Usertype) => {
    setRedirectTo(nextRedirectTo ?? null);
    setDefaultUsertype(usertype ?? "customer");
    setMode("login");
    setIsOpen(true);
  };

  const openRegister = (nextRedirectTo?: string, usertype?: Usertype) => {
    setRedirectTo(nextRedirectTo ?? null);
    setDefaultUsertype(usertype ?? "customer");
    setMode("register");
    setIsOpen(true);
  };

  const switchMode = (nextMode: AuthModalMode) => setMode(nextMode);

  const close = () => {
    setIsOpen(false);
    setRedirectTo(null);
    setDefaultUsertype("customer");
  };

  return (
    <AuthModalContext.Provider value={{ isOpen, mode, redirectTo, defaultUsertype, openLogin, openRegister, switchMode, close }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
}
