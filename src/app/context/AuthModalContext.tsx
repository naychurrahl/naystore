import { createContext, useContext, useState, type ReactNode } from "react";

type AuthModalMode = "login" | "register";
type Usertype = "customer" | "merchant";
// Filled in when the modal opens or switches: the email to start with, and
// whether login should go straight to "forgot password".
type Prefill = { email?: string; forgot?: boolean } | null;

interface AuthModalContextValue {
  isOpen: boolean;
  mode: AuthModalMode;
  redirectTo: string | null;
  defaultUsertype: Usertype;
  prefill: Prefill;
  openLogin: (redirectTo?: string, defaultUsertype?: Usertype) => void;
  openRegister: (redirectTo?: string, defaultUsertype?: Usertype, email?: string) => void;
  switchMode: (mode: AuthModalMode, prefill?: Prefill) => void;
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
  const [prefill, setPrefill] = useState<Prefill>(null);

  const openLogin = (nextRedirectTo?: string, usertype?: Usertype) => {
    setRedirectTo(nextRedirectTo ?? null);
    setDefaultUsertype(usertype ?? "customer");
    setPrefill(null);
    setMode("login");
    setIsOpen(true);
  };

  const openRegister = (nextRedirectTo?: string, usertype?: Usertype, email?: string) => {
    setRedirectTo(nextRedirectTo ?? null);
    setDefaultUsertype(usertype ?? "customer");
    setPrefill(email ? { email } : null);
    setMode("register");
    setIsOpen(true);
  };

  const switchMode = (nextMode: AuthModalMode, nextPrefill: Prefill = null) => {
    setPrefill(nextPrefill);
    setMode(nextMode);
  };

  const close = () => {
    setIsOpen(false);
    setRedirectTo(null);
    setDefaultUsertype("customer");
  };

  return (
    <AuthModalContext.Provider value={{ isOpen, mode, redirectTo, defaultUsertype, prefill, openLogin, openRegister, switchMode, close }}>
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
