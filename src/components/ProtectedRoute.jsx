import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import Loader from "./Loader";

/* User route protection: distinguishes authenticated, initial loading/hydration, and unauthenticated states */
export default function ProtectedRoute({ children }) {
  const { currentUser, authLoading, authHydrated } = useSelector((s) => s.user || {});
  const location = useLocation();

  // 1. Authenticated user: grant access immediately without blocking or unmounting
  if (currentUser) {
    return children;
  }

  // 2. Initial authentication hydration in progress (verifying existing token on initial boot)
  if (authLoading || !authHydrated) {
    return <Loader />;
  }

  // 3. Unauthenticated user or invalid/expired session
  return <Navigate to="/login" state={{ from: location }} replace />;
}
