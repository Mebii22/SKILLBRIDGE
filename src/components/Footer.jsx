import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiInstagram, FiTwitter, FiLinkedin, FiGithub } from "react-icons/fi";
import { LogoMark } from "./Navbar";
import { getSocialUrl } from "../utils/socials";

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((s) => s.user.currentUser);

  const goHowItWorks = () => {
    const scroll = () => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
    if (location.pathname === "/") scroll();
    else {
      navigate("/");
      setTimeout(scroll, 450);
    }
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="logo">
              <LogoMark />
              skillbridge
            </Link>
            <p>A peer-to-peer skill exchange community. Learn what you want, teach what you know — no fees, just people helping people.</p>
            <div className="socials">
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
          </div>

          <div>
            <div className="footer-title">Explore</div>
            <div className="footer-links">
              <Link to="/discover">Discover</Link>
              <button onClick={goHowItWorks} style={{ textAlign: "left", color: "var(--gray)", fontSize: "14.5px" }}>How It Works</button>
              <Link to="/about">About</Link>
              <a href="#">Help</a>
            </div>
          </div>

          <div>
            <div className="footer-title">Account</div>
            <div className="footer-links">
              <Link to="/login">Login</Link>
              <Link to="/register">Sign Up</Link>
              <Link to="/dashboard">Dashboard</Link>
            </div>
          </div>

          <div>
            <div className="footer-title">Community</div>
            <div className="footer-links">
              <a href="#">Guidelines</a>
              <a href="#">Safety</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 SkillBridge. All rights reserved.</span>
          <span>Made for learners, by learners.</span>
        </div>
      </div>
    </footer>
  );
}
