import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import Loader from "./Loader";

/* Admin route protection: strictly enforces authenticated user with role === "admin".
   Never trusts client-side localStorage flags like adminLoggedIn. */
export default function AdminProtectedRoute({ children }) {
  const { currentUser, authLoading, authHydrated } = useSelector((s) => s.user || {});
  const location = useLocation();

  // 1. Authenticated administrator: grant access immediately
  if (currentUser) {
    if (currentUser.role === "admin") {
      return children;
    }
    return <Navigate to="/admin/login" replace />;
  }

  // 2. If authentication is still loading / hydrating, display existing loading UI
  if (authLoading || !authHydrated) {
    return <Loader />;
  }

  // 3. Unauthenticated user redirected to /admin/login
  return <Navigate to="/admin/login" state={{ from: location }} replace />;
}
