import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiMapPin, FiStar, FiBookmark, FiSend, FiArrowLeft, FiCheck,
  FiInstagram, FiTwitter, FiLinkedin, FiGithub, FiClock, FiGlobe,
} from "react-icons/fi";
import SkillTag from "../../components/SkillTag";
import ExchangeRequestModal from "../../components/ExchangeRequestModal";
import { toggleSaved, toggleSavedAsync } from "../../redux/slices/savedSlice";
import { fetchUsersAsync } from "../../redux/slices/userSlice";
import { getSocialUrl } from "../../utils/socials";
import { calculateMatchScore } from "../../utils/matching";

export default function Profile() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const allUsers = useSelector((s) => s.user.users);
  const currentUser = useSelector((s) => s.user.currentUser);

  useEffect(() => {
    dispatch(fetchUsersAsync());
  }, [dispatch]);

  const user = (allUsers || []).find((u) => String(u.id || u._id) === String(id));
  const savedIds = useSelector((s) => s.saved.savedIds);
  const saved = user ? savedIds.some((sid) => String(sid) === String(user.id || user._id)) : false;

  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(false);

  const isSelf = currentUser && user && String(currentUser.id || currentUser._id) === String(user.id || user._id);
  const matchData = calculateMatchScore(currentUser, user);

  if (!user) {
    return (
      <div className="dash-panel">
        <p>User profile not found. <Link to="/discover" className="link">Back to Discover</Link></p>
      </div>
    );
  }

  const reviews = user.reviews || [];
  const modeBadge =
    user.mode === "Offline" ? "📍 Offline" : user.mode === "Online" ? "🌐 Online" : "🔄 Both (Online & Offline)";

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <Link to="/discover" className="panel-link"><FiArrowLeft /> Back to Discover</Link>
      </div>

      {/* header */}
      <div className="dash-panel">
        <div style={{ display: "flex", gap: 26, alignItems: "center", flexWrap: "wrap" }}>
          <div className="pc-photo-wrap" style={{ width: 110, height: 110 }}>
            <img src={user.photo} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 34 }}>{user.name}</h1>
              <span
                style={{
                  fontSize: 13,
                  padding: "3px 10px",
                  borderRadius: 14,
                  background: "var(--cream)",
                  border: "1px solid var(--border)",
                  fontWeight: 600,
                }}
              >
                {modeBadge}
              </span>
            </div>
            <div className="pc-loc" style={{ fontSize: 14, marginTop: 4 }}>
              <FiMapPin /> {user.city ? `${user.city}, Kerala` : user.location}
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 14, color: "var(--gray)", flexWrap: "wrap" }}>
              <span className="stars" style={{ alignItems: "center", gap: 5 }}>
                <FiStar fill="#F7C843" stroke="#111" /> <b style={{ color: "var(--ink)" }}>{user.rating || 5.0}</b> rating
              </span>
              <span><b style={{ color: "var(--ink)" }}>{user.completed || 0}</b> completed exchanges</span>
              <span className="match-badge" title={matchData.label}>
                {matchData.icon} {matchData.score}% Match · {matchData.label}
              </span>
            </div>
            <div className="socials" style={{ marginTop: 12 }}>
              <a
                href={getSocialUrl("instagram", user.socials?.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title={user.socials?.instagram ? `Instagram: ${user.socials.instagram}` : "Visit Instagram"}
              >
                <FiInstagram />
              </a>
              <a
                href={getSocialUrl("twitter", user.socials?.twitter)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                title={user.socials?.twitter ? `Twitter / X: ${user.socials.twitter}` : "Visit Twitter / X"}
              >
                <FiTwitter />
              </a>
              <a
                href={getSocialUrl("linkedin", user.socials?.linkedin)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                title={user.socials?.linkedin ? `LinkedIn: ${user.socials.linkedin}` : "Visit LinkedIn"}
              >
                <FiLinkedin />
              </a>
              <a
                href={getSocialUrl("github", user.socials?.github)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                title={user.socials?.github ? `GitHub: ${user.socials.github}` : "Visit GitHub"}
              >
                <FiGithub />
              </a>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {isSelf ? (
              <Link to="/my-profile" className="btn btn-dark btn-sm">
                Edit My Profile
              </Link>
            ) : (
              <>
                <button className="btn btn-dark btn-sm" onClick={() => setShowModal(true)}>
                  <FiSend /> Send Exchange Request
                </button>
                <button
                  className={`btn btn-sm ${saved ? "btn-yellow" : "btn-outline"}`}
                  onClick={() => {
                    const uid = user.id || user._id;
                    dispatch(toggleSaved(uid));
                    dispatch(toggleSavedAsync(user._id || user.id));
                  }}
                >
                  {saved ? <><FiCheck /> Saved</> : <><FiBookmark /> Save Profile</>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24 }} className="profile-grid">
        <div>
          <div className="dash-panel">
            <div className="panel-title"><h3>Can Teach</h3></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(user.teaches || []).map((t) => <SkillTag key={t} yellow>{t}</SkillTag>)}
              {(user.teaches || []).length === 0 && <p style={{ color: "var(--gray)", fontSize: 14 }}>No skills listed yet.</p>}
            </div>
          </div>

          <div className="dash-panel">
            <div className="panel-title"><h3>Wants to Learn</h3></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(user.wants || []).map((t) => <SkillTag key={t}>{t}</SkillTag>)}
              {(user.wants || []).length === 0 && <p style={{ color: "var(--gray)", fontSize: 14 }}>No skills listed yet.</p>}
            </div>
          </div>

          <div className="dash-panel">
            <div className="panel-title"><h3>Availability & Preferences</h3></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FiClock style={{ color: "var(--gray)" }} />
                <span><b>Availability:</b> {user.availability || "Weekends & weekday evenings"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FiGlobe style={{ color: "var(--gray)" }} />
                <span><b>Exchange Mode:</b> {modeBadge}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FiMapPin style={{ color: "var(--gray)" }} />
                <span><b>Location:</b> {user.location || "Kerala, India"}</span>
              </div>
            </div>
          </div>

          <div className="dash-panel">
            <div className="panel-title"><h3>About</h3></div>
            <p style={{ color: "var(--gray)", fontSize: 15, lineHeight: 1.6 }}>{user.bio || "No bio added yet."}</p>
          </div>
        </div>

        <div className="dash-panel">
          <div className="panel-title">
            <h3>Reviews ({reviews.length})</h3>
          </div>
          {reviews.length === 0 ? (
            <p style={{ color: "var(--gray)", fontSize: 13.5 }}>No reviews yet for this community member.</p>
          ) : (
            reviews.map((r, i) => (
              <div key={i} style={{ borderBottom: i < reviews.length - 1 ? "1px solid var(--border)" : "none", paddingBottom: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b style={{ fontSize: 14 }}>{r.from}</b>
                  <span className="stars">
                    {[...Array(r.rating || 5)].map((_, s) => <FiStar key={s} fill="#F7C843" stroke="#111" />)}
                  </span>
                </div>
                <p style={{ color: "var(--gray)", fontSize: 13.5, marginTop: 6 }}>“{r.text}”</p>
                {r.date && <div style={{ fontSize: 12, color: "var(--gray)", marginTop: 4 }}>{r.date}</div>}
              </div>
            ))
          )}
        </div>
      </div>

      <ExchangeRequestModal
        targetUser={user}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setToast(true);
          setTimeout(() => setToast(false), 2600);
        }}
      />

      {toast && <div className="toast"><i /> Exchange request sent to {user.name}!</div>}
    </>
  );
}
