import { useEffect } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuthModal } from "../context/AuthModalContext";

// A direct/bookmarked visit to /register - pops the global modal over the
// homepage instead of rendering a full page, same as Login.tsx does for
// /login. In-app triggers call openRegister() directly and never hit this
// route.
export function Register() {
  const { openRegister } = useAuthModal();
  const location = useLocation();

  useEffect(() => {
    openRegister((location.state as any)?.from ?? "/profile");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Navigate to="/" replace />;
}
