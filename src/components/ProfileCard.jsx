import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiMapPin, FiBookmark, FiArrowRight, FiArrowUpRight, FiArrowDownLeft, FiSend } from "react-icons/fi";
import { toggleSaved, toggleSavedAsync } from "../redux/slices/savedSlice";
import SkillTag from "./SkillTag";
import ExchangeRequestModal from "./ExchangeRequestModal";
import { calculateMatchScore } from "../utils/matching";

export default function ProfileCard({ user }) {
  const dispatch = useDispatch();
  const savedIds = useSelector((s) => s.saved.savedIds);
  const currentUser = useSelector((s) => s.user.currentUser);
  const targetId = user.id || user._id;
  const saved = savedIds.map(String).includes(String(targetId));

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [toast, setToast] = useState(false);

  const matchData = calculateMatchScore(currentUser, user);

  const teaches = (user.teaches || []).join(", ") || "None";
  const wants = (user.wants || []).join(", ") || "None";

  const modeBadge =
    user.mode === "Offline" ? "📍 Offline" : user.mode === "Online" ? "🌐 Online" : "🔄 Both";

  const handleSwapSuccess = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2600);
  };

  const handleToggleSaved = () => {
    dispatch(toggleSaved(targetId));
    dispatch(toggleSavedAsync(targetId));
  };

  return (
    <>
      <div className="profile-card">
        <div className="pc-top">
          <div className="pc-photo-wrap">
            <img src={user.photo} alt={user.name} />
          </div>
          <div>
            <div className="pc-name">{user.name}</div>
            <div className="pc-loc" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span><FiMapPin /> {user.city || user.location}</span>
              <span
                style={{
                  fontSize: 11.5,
                  padding: "1px 7px",
                  borderRadius: 10,
                  background: "var(--cream)",
                  border: "1px solid var(--border)",
                  color: "var(--ink)",
                  fontWeight: 500,
                }}
              >
                {modeBadge}
              </span>
            </div>
          </div>
          <button
            className={`icon-btn ${saved ? "saved" : ""}`}
            style={{ marginLeft: "auto" }}
            onClick={handleToggleSaved}
            title="Save profile"
          >
            <FiBookmark fill={saved ? "#111" : "none"} />
          </button>
        </div>

        <div className="pc-swap">
          <div className="swap-row">
            <span className="pc-label"><FiArrowUpRight /> Can Teach</span>
            <SkillTag yellow>{teaches}</SkillTag>
          </div>
          <div className="swap-row">
            <span className="pc-label"><FiArrowDownLeft /> Wants to Learn</span>
            <SkillTag>{wants}</SkillTag>
          </div>
        </div>

        {matchData.explanation && (
          <div
            style={{
              padding: "6px 10px",
              margin: "6px 0 10px",
              borderRadius: "8px",
              background: matchData.tier === "excellent" ? "rgba(46, 125, 50, 0.08)" : "var(--cream)",
              border: `1px solid ${matchData.tier === "excellent" ? "rgba(46, 125, 50, 0.2)" : "var(--border)"}`,
              fontSize: "11.5px",
              color: matchData.tier === "excellent" ? "#1b5e20" : "var(--ink)",
              display: "flex",
              alignItems: "flex-start",
              gap: "6px",
              lineHeight: 1.35,
            }}
          >
            <span style={{ fontSize: "12px", flexShrink: 0 }}>💡</span>
            <span style={{ flex: 1 }}>{matchData.explanation}</span>
          </div>
        )}

        <div className="pc-foot" style={{ gap: 8, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <span
            className="match-badge"
            title={matchData.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{matchData.icon}</span>
            <span>{matchData.score}% Match</span>
          </span>

          <div style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center", flexWrap: "wrap" }}>
            {currentUser && currentUser.id === user.id ? (
              <span
                style={{
                  fontSize: 12,
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: "var(--cream)",
                  border: "1px solid var(--border)",
                  color: "var(--gray)",
                  fontWeight: 600,
                }}
              >
                You
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-dark btn-xs"
                style={{
                  padding: "6px 13px",
                  fontSize: 12.5,
                  background: "var(--ink)",
                  color: "#ffffff",
                  borderColor: "var(--ink)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                onClick={() => setShowSwapModal(true)}
                title={`Start a skill swap with ${user.name}`}
              >
                <FiSend /> Start Swap
              </button>
            )}
            <Link
              to={`/profile/${user.id || user._id}`}
              className="btn btn-outline btn-xs"
              style={{
                padding: "6px 11px",
                fontSize: 12.5,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Profile <FiArrowRight />
            </Link>
          </div>
        </div>
      </div>

      <ExchangeRequestModal
        targetUser={user}
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        onSuccess={handleSwapSuccess}
      />

      {toast && (
        <div className="toast">
          <i /> Exchange request sent to {user.name}!
        </div>
      )}
    </>
  );
}
