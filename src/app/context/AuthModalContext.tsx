import { createContext, useContext, useState, type ReactNode } from "react";

interface AuthModalContextValue {
  isOpen: boolean;
  redirectTo: string | null;
  openLogin: (redirectTo?: string) => void;
  close: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

// Global so it can be triggered from anywhere - including routes that sit
// outside the storefront Layout tree, like MerchantProtectedRoute - and
// renders once at the App root so it can cover whatever page is underneath.
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  const openLogin = (nextRedirectTo?: string) => {
    setRedirectTo(nextRedirectTo ?? null);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setRedirectTo(null);
  };

  return (
    <AuthModalContext.Provider value={{ isOpen, redirectTo, openLogin, close }}>
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
