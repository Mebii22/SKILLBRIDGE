import { Navigate } from "react-router-dom";

/* Admin route protection (frontend demo): redirects to /admin/login when not admin. */
export default function AdminProtectedRoute({ children }) {
  if (localStorage.getItem("adminLoggedIn") !== "true") {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
