import { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiMenu, FiX } from "react-icons/fi";

/* small hand-drawn connecting symbol used next to the wordmark */
export function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M13 20 Q20 13 27 20" stroke="#111" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="11" cy="21" r="7" fill="#111" />
      <circle cx="29" cy="21" r="7" fill="#F7C843" stroke="#111" strokeWidth="2.5" />
    </svg>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const user = useSelector((s) => s.user.currentUser);
  const navigate = useNavigate();
  const location = useLocation();

  const goHowItWorks = () => {
    setOpen(false);
    const scroll = () => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
    if (location.pathname === "/") scroll();
    else {
      navigate("/");
      setTimeout(scroll, 450);
    }
  };

  const linkClass = ({ isActive }) => (isActive ? "active" : "");

  return (
    <div className="navbar-wrap">
      <nav className="navbar">
        <Link to="/" className="logo" onClick={() => setOpen(false)}>
          <LogoMark />
          skillbridge
        </Link>

        <div className="nav-links">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/discover" className={linkClass}>Discover</NavLink>
          <button onClick={goHowItWorks}>How It Works</button>
          <NavLink to="/about" className={linkClass}>About</NavLink>
        </div>

        <div className="nav-actions">
          {user ? (
            <Link to="/dashboard" className="btn btn-dark btn-sm">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
              <Link to="/register" className="btn btn-dark btn-sm">Sign Up</Link>
            </>
          )}
          <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </nav>

      <div className={`mobile-menu ${open ? "open" : ""}`}>
        <NavLink to="/" end onClick={() => setOpen(false)}>Home</NavLink>
        <NavLink to="/discover" onClick={() => setOpen(false)}>Discover</NavLink>
        <button className="link-btn" onClick={goHowItWorks}>How It Works</button>
        <NavLink to="/about" onClick={() => setOpen(false)}>About</NavLink>
        <div className="mm-actions">
          {user ? (
            <Link to="/dashboard" className="btn btn-dark btn-sm" onClick={() => setOpen(false)}>Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>Login</Link>
              <Link to="/register" className="btn btn-dark btn-sm" onClick={() => setOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
