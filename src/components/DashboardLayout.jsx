import { useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiGrid, FiSearch, FiRepeat, FiMessageCircle, FiCalendar, FiBookmark,
  FiBell, FiUser, FiSettings, FiLogOut, FiMenu, FiPlus,
  FiInstagram, FiTwitter, FiLinkedin, FiGithub,
} from "react-icons/fi";
import { logoutUser } from "../redux/slices/userSlice";
import { LogoMark } from "./Navbar";
import { getSocialUrl } from "../utils/socials";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: <FiGrid /> },
  { to: "/discover", label: "Discover", icon: <FiSearch /> },
  { to: "/share-skill", label: "Share a Skill", icon: <FiPlus /> },
  { to: "/exchanges", label: "My Exchanges", icon: <FiRepeat /> },
  { to: "/messages", label: "Messages", icon: <FiMessageCircle /> },
  { to: "/sessions", label: "Sessions", icon: <FiCalendar /> },
  { to: "/saved", label: "Saved Profiles", icon: <FiBookmark /> },
  { to: "/notifications", label: "Notifications", icon: <FiBell /> },
  { to: "/my-profile", label: "My Profile", icon: <FiUser /> },
  { to: "/settings", label: "Settings", icon: <FiSettings /> },
];

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const user = useSelector((s) => s.user.currentUser);
  const unread = useSelector((s) => s.notifications.items.filter((n) => !n.read).length);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const userPhoto = user?.photo || "https://randomuser.me/api/portraits/men/22.jpg";

  const logout = () => {
    dispatch(logoutUser());
    navigate("/");
  };

  return (
    <div className="dash">
      <div className={`sidebar-overlay ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link to="/" className="side-logo" onClick={() => setOpen(false)}>
          <LogoMark size={24} />
          skillbridge
        </Link>

        <nav className="side-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {item.icon}
              {item.label}
              {item.to === "/notifications" && unread > 0 && <span className="side-badge">{unread}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="side-bottom">
          <div className="side-user">
            <img src={userPhoto} alt={user?.name || "User"} />
            <div>
              <div className="su-name">{user?.fullName || user?.name || "Community Member"}</div>
              <div className="su-mail">{user?.email || "user@skillbridge.com"}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>

      <main className="dash-main" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div className="topbar">
          <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><FiMenu /></button>
          <div className="top-search" onClick={() => navigate("/discover")} style={{ cursor: "pointer" }}>
            <FiSearch />
            <input placeholder="Search skills or people…" readOnly />
          </div>
          <div className="top-actions">
            <Link to="/notifications" className="top-icon" title="Notifications">
              <FiBell />
              {unread > 0 && <span className="bell-badge">{unread}</span>}
            </Link>
            <Link to="/my-profile" className="avatar-btn" title="My profile">
              <img src={userPhoto} alt="me" />
            </Link>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <Outlet />
        </div>

        <footer
          className="dash-footer"
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 13.5, color: "var(--gray)" }}>
            © 2026 SkillBridge. Connected as <b>{user?.fullName || user?.name || "Learner"}</b>.
          </div>
          <div className="socials" style={{ marginTop: 0 }}>
            <a
              href={getSocialUrl("instagram", user?.socials?.instagram)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              title={user?.socials?.instagram ? `Instagram: ${user.socials.instagram}` : "Visit Instagram"}
            >
              <FiInstagram />
            </a>
            <a
              href={getSocialUrl("twitter", user?.socials?.twitter)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter / X"
              title={user?.socials?.twitter ? `Twitter / X: ${user.socials.twitter}` : "Visit Twitter / X"}
            >
              <FiTwitter />
            </a>
            <a
              href={getSocialUrl("linkedin", user?.socials?.linkedin)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              title={user?.socials?.linkedin ? `LinkedIn: ${user.socials.linkedin}` : "Visit LinkedIn"}
            >
              <FiLinkedin />
            </a>
            <a
              href={getSocialUrl("github", user?.socials?.github)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              title={user?.socials?.github ? `GitHub: ${user.socials.github}` : "Visit GitHub"}
            >
              <FiGithub />
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
