import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import Loader from "./Loader";

/* User route protection: distinguishes auth loading, authenticated, and unauthenticated/expired states */
export default function ProtectedRoute({ children }) {
  const { currentUser, authLoading, authHydrated } = useSelector((s) => s.user || {});
  const location = useLocation();

  // 1. Distinguish: Authentication still verifying / loading
  if (authLoading || !authHydrated) {
    return <Loader />;
  }

  // 2. Distinguish: Unauthenticated user or invalid/expired session
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Distinguish: Authenticated user
  return children;
}
