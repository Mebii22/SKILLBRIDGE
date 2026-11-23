import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  FiGrid,
  FiUsers,
  FiList,
  FiRepeat,
  FiCalendar,
  FiActivity,
  FiLogOut,
  FiMenu
} from "react-icons/fi";
import { LogoMark } from "./Navbar";
import { logoutUser } from "../redux/slices/userSlice";

const NAV = [
  { to: "/admin/dashboard", label: "Overview", icon: <FiGrid /> },
  { to: "/admin/users", label: "Users", icon: <FiUsers /> },
  { to: "/admin/skills", label: "Skills", icon: <FiList /> },
  { to: "/admin/exchanges", label: "Exchanges", icon: <FiRepeat /> },
  { to: "/admin/sessions", label: "Sessions", icon: <FiCalendar /> },
  { to: "/admin/activity", label: "Activity", icon: <FiActivity /> },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user.currentUser);

  const logout = () => {
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("user");
    dispatch(logoutUser());
    navigate("/admin/login");
  };

  const adminName =
    (currentUser?.role === "admin" && (!currentUser?.fullName || currentUser?.fullName === "jeny"))
      ? "SKILLBRIDGE Admin"
      : (currentUser?.fullName || currentUser?.name || "SKILLBRIDGE Admin");
  const adminEmail = currentUser?.email || "admin@skillbridge.com";

  return (
    <div className="dash">
      <div className={`sidebar-overlay ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar admin-sidebar ${open ? "open" : ""}`}>
        <div className="side-logo">
          <LogoMark size={24} />
          skillbridge
        </div>
        <div className="admin-tagline">Admin Panel</div>

        <nav className="side-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin/dashboard"}
              className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="side-bottom">
          <div className="side-user" style={{ background: "rgba(255,255,255,0.08)" }}>
            <span className="admin-avatar">A</span>
            <div>
              <div className="su-name" style={{ color: "#fff" }}>{adminName}</div>
              <div className="su-mail" style={{ color: "#9a9a9a" }}>{adminEmail}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>

      <main className="dash-main">
        <div className="topbar">
          <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><FiMenu /></button>
          <h1 className="serif" style={{ fontSize: "24px" }}>Admin Dashboard</h1>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
