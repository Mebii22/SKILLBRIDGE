import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import Loader from "./Loader";

/* Admin route protection: strictly enforces authenticated user with role === "admin".
   Never trusts client-side localStorage flags like adminLoggedIn. */
export default function AdminProtectedRoute({ children }) {
  const { currentUser, authLoading, authHydrated } = useSelector((s) => s.user || {});
  const location = useLocation();

  // 1. If authentication is still loading / hydrating, display existing loading UI
  if (authLoading || !authHydrated) {
    return <Loader />;
  }

  // 2. Require an authenticated user (unauthenticated users redirected to /admin/login)
  if (!currentUser) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // 3. Strictly verify currentUser.role === "admin"
  if (currentUser.role !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  // 4. Authenticated administrator verified — allow access
  return children;
}
