import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";

export function MerchantProtectedRoute() {
  const { user } = useAuth();
  const { openLogin } = useAuthModal();
  const location = useLocation();

  useEffect(() => {
    // Opens Login (not Register) since a /merchant visit more often means a
    // returning merchant who's just signed out - but its "Create one" link
    // carries the merchant default through if that guess is wrong.
    if (!user) openLogin(location.pathname, "merchant");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Keeps the merchant portal separate from the staff/admin one - a staff
  // or admin session hitting /merchant belongs back in the staff app. A
  // logged-in customer lands on /become-merchant instead of a bare bounce,
  // since upgrading in place is one click away from here.
  if (user.role !== "merchant") {
    return <Navigate to={user.role === "customer" ? "/become-merchant" : "/"} replace />;
  }

  return <Outlet />;
}
