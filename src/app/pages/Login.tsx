import { useEffect } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuthModal } from "../context/AuthModalContext";

// A direct/bookmarked visit to /login - pops the global modal over the
// homepage instead of rendering a full page. In-app triggers (nav icon,
// footer link, protected-route redirects) call openLogin() directly and
// never hit this route.
export function Login() {
  const { openLogin } = useAuthModal();
  const location = useLocation();

  useEffect(() => {
    openLogin((location.state as any)?.from ?? "/profile");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Navigate to="/" replace />;
}
