import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function AdminProtectedRoute({ children }) {
  const adminLoggedIn = typeof localStorage !== "undefined" && localStorage.getItem("adminLoggedIn") === "true";
  const token = typeof localStorage !== "undefined" && localStorage.getItem("token");
  const currentUser = useSelector((s) => s.user?.currentUser);

  if (!adminLoggedIn || !token) {
    return <Navigate to="/admin/login" replace />;
  }

  // If currentUser is loaded and role is not admin, deny access
  if (currentUser && currentUser.role && currentUser.role !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
