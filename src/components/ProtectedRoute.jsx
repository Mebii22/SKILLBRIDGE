import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

/* User route protection (frontend demo): redirects to /login when not logged in. */
export default function ProtectedRoute({ children }) {
  const user = useSelector((s) => s.user.currentUser);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
