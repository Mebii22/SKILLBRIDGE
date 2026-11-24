import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiMapPin, FiBookmark, FiArrowRight, FiArrowUpRight, FiArrowDownLeft, FiSend } from "react-icons/fi";
import { toggleSaved, toggleSavedAsync } from "../redux/slices/savedSlice";
import SkillTag from "./SkillTag";
import ExchangeRequestModal from "./ExchangeRequestModal";
import { calculateMatchScore } from "../utils/matching";

export default function ProfileCard({ user, onRemove, showRemoveBtn = false }) {
  const dispatch = useDispatch();
  const savedIds = useSelector((s) => s.saved.savedIds);
  const currentUser = useSelector((s) => s.user.currentUser);
  const targetId = user.id || user._id;
  const saved = savedIds.map(String).includes(String(targetId));

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [toast, setToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setToast(true);
    setTimeout(() => setToast(false), 2400);
  };

  const matchData = calculateMatchScore(currentUser, user);

  const teaches = (user.teaches || []).join(", ") || "None";
  const wants = (user.wants || []).join(", ") || "None";

  const modeBadge =
    user.mode === "Offline" ? "📍 Offline" : user.mode === "Online" ? "🌐 Online" : "🔄 Both";

  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "Member")}&background=F5C518&color=111111&bold=true`;
  const avatarSrc = user.photo || avatarFallback;

  const handleSwapSuccess = () => {
    triggerToast(`Exchange request sent to ${user.name}!`);
  };

  const handleToggleSaved = (e) => {
    if (e) e.stopPropagation();
    const willSave = !saved;
    dispatch(toggleSaved(targetId));
    dispatch(toggleSavedAsync(targetId));
    triggerToast(willSave ? `${user.name} added to saved profiles!` : `${user.name} removed from saved profiles.`);
    if (onRemove && !willSave) {
      onRemove(targetId);
    }
  };

  return (
    <>
      <div className="profile-card">
        <div className="pc-top">
          <div className="pc-photo-wrap">
            <img
              src={avatarSrc}
              alt={user.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = avatarFallback;
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pc-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name}
            </div>
            <div className="pc-loc" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span><FiMapPin /> {user.city || user.location || "Everywhere"}</span>
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
            {(user.rating > 0 || user.completed > 0) ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--gray)", marginTop: 2 }}>
                {user.rating > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 700, color: "var(--ink)" }}>
                    <span style={{ color: "#f59e0b" }}>★</span> {Number(user.rating).toFixed(1)}
                  </span>
                )}
                {user.completed > 0 && (
                  <span>{user.completed} {user.completed === 1 ? "swap" : "swaps"}</span>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--gray)", marginTop: 2 }}>
                <span style={{ color: "var(--gray)", fontSize: 11.5 }}>★ New Member</span>
              </div>
            )}
          </div>
          {showRemoveBtn ? (
            <button
              type="button"
              className="btn-xs danger"
              style={{
                marginLeft: "auto",
                padding: "5px 11px",
                borderRadius: "999px",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={handleToggleSaved}
              title={`Remove ${user.name} from saved profiles`}
            >
              <FiBookmark fill="#B3261E" /> Remove
            </button>
          ) : (
            <button
              type="button"
              className={`icon-btn ${saved ? "saved" : ""}`}
              style={{ marginLeft: "auto" }}
              onClick={handleToggleSaved}
              title={saved ? "Remove from saved profiles" : "Save profile"}
            >
              <FiBookmark fill={saved ? "#111" : "none"} />
            </button>
          )}
        </div>

        {user.bio && (
          <p
            style={{
              fontSize: 12.5,
              color: "var(--gray)",
              lineHeight: 1.45,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {user.bio}
          </p>
        )}

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
              margin: "2px 0 6px",
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
            {currentUser && (currentUser.id === user.id || currentUser._id === user._id) ? (
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
          <i /> {toastMsg}
        </div>
      )}
    </>
  );
}
