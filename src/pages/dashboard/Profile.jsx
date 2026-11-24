import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiMapPin, FiStar, FiBookmark, FiSend, FiArrowLeft, FiCheck,
  FiInstagram, FiTwitter, FiLinkedin, FiGithub, FiClock, FiGlobe,
  FiFlag, FiX, FiAlertCircle
} from "react-icons/fi";
import SkillTag from "../../components/SkillTag";
import ExchangeRequestModal from "../../components/ExchangeRequestModal";
import { toggleSaved, toggleSavedAsync } from "../../redux/slices/savedSlice";
import { fetchUsersAsync } from "../../redux/slices/userSlice";
import { getSocialUrl } from "../../utils/socials";
import { calculateMatchScore } from "../../utils/matching";
import API from "../../api/client";

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

  // Member Reporting State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState("");

  const isSelf = currentUser && user && String(currentUser.id || currentUser._id) === String(user.id || user._id);
  const matchData = calculateMatchScore(currentUser, user);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) {
      setReportError("Please describe the reason for your report.");
      return;
    }
    setReporting(true);
    setReportError("");

    try {
      await API.post("/admin/reports", {
        target: user.fullName || user.name,
        targetId: user._id || user.id,
        reason: reportReason.trim(),
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setShowReportModal(false);
        setReportReason("");
      }, 2000);
    } catch (err) {
      setReportError(err.response?.data?.message || "Failed to submit report. Please try again.");
    } finally {
      setReporting(false);
    }
  };

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
                <FiStar fill="#F7C843" stroke="#111" /> <b style={{ color: "var(--ink)" }}>{user.rating > 0 ? Number(user.rating).toFixed(1) : "Unrated"}</b> rating
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
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ color: "#b71c1c", borderColor: "#ffcdd2" }}
                  onClick={() => setShowReportModal(true)}
                  title="Report inappropriate content or profile"
                >
                  <FiFlag /> Report
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

      {/* Member Reporting Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: 480, borderRadius: 24, padding: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                  <FiFlag />
                </span>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Report Member</h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowReportModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}
              >
                <FiX />
              </button>
            </div>

            <p style={{ fontSize: 13.5, color: "var(--gray)", marginBottom: 16 }}>
              Help keep SkillBridge safe and constructive. Reports are strictly private and reviewed by platform administrators.
            </p>

            {reportSuccess ? (
              <div style={{ padding: "16px 20px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, color: "#166534", fontSize: 14 }}>
                <FiCheck style={{ marginRight: 6 }} /> Report submitted successfully. Thank you for helping our community.
              </div>
            ) : (
              <form onSubmit={handleReportSubmit}>
                {reportError && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#991b1b", fontSize: 13, marginBottom: 14 }}>
                    <FiAlertCircle /> {reportError}
                  </div>
                )}

                <div className="field" style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Reason for reporting {user.fullName || user.name}:
                  </label>
                  <textarea
                    rows={4}
                    className="input"
                    placeholder="Describe the issue (e.g. spam, inappropriate communication, harassment, fake listing)..."
                    value={reportReason}
                    onChange={(e) => { setReportReason(e.target.value); setReportError(""); }}
                    required
                    style={{ width: "100%", resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowReportModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm"
                    style={{ background: "#dc2626", color: "#fff", borderColor: "#dc2626" }}
                    disabled={reporting || !reportReason.trim()}
                  >
                    {reporting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
