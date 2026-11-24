import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiX,
  FiSend,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiVideo,
  FiShield,
  FiAlertCircle,
  FiInfo,
} from "react-icons/fi";
import { SKILLS } from "../data/dummyData";
import { sendRequest, createExchangeAsync } from "../redux/slices/exchangeSlice";
import { addNotification } from "../redux/slices/notificationSlice";
import { calculateMatchScore } from "../utils/matching";

export default function ExchangeRequestModal({ targetUser, isOpen, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user.currentUser);

  const effectiveUser = currentUser;
  const currentUserId = currentUser?._id || currentUser?.id;
  const targetUserId = targetUser?._id || targetUser?.id;
  const isSelf = currentUserId && targetUserId && String(currentUserId) === String(targetUserId);

  const matchData = calculateMatchScore(currentUser, targetUser);

  const todayDate = new Date().toISOString().split("T")[0];
  const defaultStartDate = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const myTeaches = effectiveUser?.teaches || [];
  const otherSkillsForMe = SKILLS.filter((s) => !myTeaches.includes(s));

  const targetTeaches = targetUser?.teaches || [];
  const otherSkillsForPartner = SKILLS.filter((s) => !targetTeaches.includes(s));

  const [form, setForm] = useState({
    teach: "",
    want: "",
    mode: "Online",
    totalSessions: 4,
    duration: "1 Hour",
    date: defaultStartDate,
    time: "5:00 PM",
    meetingLink: "https://meet.google.com/sb-exchange-hub",
    meetingLocation: "",
    message: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Re-calculate smart defaults whenever modal opens or target changes
  useEffect(() => {
    if (isOpen && targetUser) {
      const bestTeach =
        myTeaches.find((t) =>
          (targetUser?.wants || []).some((w) => w.toLowerCase() === t.toLowerCase())
        ) ||
        myTeaches[0] ||
        SKILLS[0];

      const bestWant =
        targetTeaches.find(
          (t) =>
            (effectiveUser?.wants || []).some((w) => w.toLowerCase() === t.toLowerCase()) &&
            t !== bestTeach
        ) ||
        targetTeaches.find((t) => t !== bestTeach) ||
        (bestTeach !== SKILLS[1] ? SKILLS[1] : SKILLS[2]);

      const bestMode =
        targetUser?.mode === "Offline" || effectiveUser?.mode === "Offline"
          ? "Offline"
          : "Online";

      const defaultLoc = targetUser?.city
        ? `Central Public Library, ${targetUser.city}`
        : targetUser?.location
        ? `Central Public Library, ${targetUser.location}`
        : "Central Public Library, Kochi";

      setForm({
        teach: bestTeach,
        want: bestWant,
        mode: bestMode,
        totalSessions: 4,
        duration: "1 Hour",
        date: defaultStartDate,
        time: "5:00 PM",
        meetingLink: "https://meet.google.com/sb-exchange-hub",
        meetingLocation: defaultLoc,
        message: "",
      });
      setError("");
    }
  }, [isOpen, targetUser, currentUser]);

  if (!isOpen || !targetUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSelf) {
      setError("You cannot propose a skill swap with yourself.");
      return;
    }

    if (!form.teach || !form.want) {
      setError("Please select both a skill you will teach and a skill you want to learn.");
      return;
    }

    if (form.teach.trim().toLowerCase() === form.want.trim().toLowerCase()) {
      setError("Please select two different skills to exchange. You cannot offer and request the same skill.");
      return;
    }

    if (form.mode === "Online" && !form.meetingLink.trim()) {
      setError("Please provide an online meeting link (Google Meet, Zoom, or Teams).");
      return;
    }

    if (form.mode === "Offline" && !form.meetingLocation.trim()) {
      setError("Please provide an offline public meeting location.");
      return;
    }

    const meetingLink =
      form.mode === "Online"
        ? form.meetingLink.trim() || "https://meet.google.com/sb-exchange-hub"
        : undefined;

    const location =
      form.mode === "Offline"
        ? form.meetingLocation.trim() ||
          (targetUser?.city ? `Central Public Library, ${targetUser.city}` : "Central Public Library, Kochi")
        : undefined;

    const targetPartnerId = targetUser.id || targetUser._id;

    try {
      setSubmitting(true);
      setError("");

      await dispatch(
        createExchangeAsync({
          partnerId: targetPartnerId,
          teach: form.teach,
          want: form.want,
          mode: form.mode,
          totalSessions: Number(form.totalSessions),
          duration: form.duration,
          preferredDate: form.date,
          preferredTime: form.time,
          meetingLink: form.mode === "Online" ? meetingLink : "",
          meetingLocation: form.mode === "Offline" ? location : "",
          message: form.message.trim(),
        })
      ).unwrap();

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to propose skill swap. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 580, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Start a Skill Swap</h3>
            <p className="modal-sub" style={{ marginTop: 4, marginBottom: 0, fontSize: 13.5 }}>
              Form a structured exchange agreement with <b>{targetUser.name}</b>
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <FiX />
          </button>
        </div>

        {/* Partner preview card with Match badge */}
        <div
          style={{
            background: "var(--cream)",
            padding: "12px 16px",
            borderRadius: 16,
            marginTop: 14,
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            gap: 12,
            border: "1px solid var(--border)",
            flexWrap: "wrap",
          }}
        >
          <img
            src={targetUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.name || "Partner")}&background=F5C518&color=111111&bold=true`}
            alt={targetUser.name}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.name || "Partner")}&background=F5C518&color=111111&bold=true`;
            }}
            style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover" }}
          />
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontWeight: 700, fontSize: 15.5 }}>{targetUser.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4 }}>
              <FiMapPin /> {targetUser.location || targetUser.city || "Kerala, India"}
            </div>
          </div>
          <span
            className="match-badge"
            style={{
              fontSize: 12.5,
              padding: "4px 10px",
              background: matchData.score >= 85 ? "rgba(46, 125, 50, 0.12)" : "rgba(247, 200, 67, 0.25)",
              color: matchData.score >= 85 ? "#2e7d32" : "#8d6a00",
              border: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontWeight: 700,
            }}
          >
            <span>{matchData.icon}</span>
            <span>{matchData.score}% Match</span>
          </span>
        </div>

        {/* Alert if viewing self */}
        {isSelf && (
          <div
            style={{
              fontSize: 13,
              color: "#991b1b",
              background: "#fee2e2",
              padding: "10px 14px",
              borderRadius: 10,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <FiAlertCircle style={{ flexShrink: 0 }} />
            <span>You are viewing your own profile. You cannot propose a skill swap with yourself.</span>
          </div>
        )}

        {/* Guest note if not logged in */}
        {!currentUser && (
          <div
            style={{
              fontSize: 12.5,
              color: "#92400e",
              background: "#fef3c7",
              padding: "8px 12px",
              borderRadius: 10,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FiInfo style={{ flexShrink: 0 }} />
            <span>You are previewing as a guest. Submitting will create a practice exchange under your guest session.</span>
          </div>
        )}

        {/* Validation error banner */}
        {error && (
          <div
            style={{
              fontSize: 13,
              color: "#b91c1c",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              padding: "10px 14px",
              borderRadius: 10,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <FiAlertCircle style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Skill 1: I Can Teach - Full width for full text visibility */}
          <div className="field">
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>I Can Teach (Offered Skill)</span>
              <span style={{ fontSize: 12, color: "var(--gray)", fontWeight: 500 }}>What you will teach</span>
            </label>
            <select
              className="input"
              value={form.teach}
              onChange={(e) => {
                setForm({ ...form, teach: e.target.value });
                if (error) setError("");
              }}
            >
              {myTeaches.length > 0 && (
                <optgroup label="⭐ Your Profile Skills (Recommended)">
                  {myTeaches.map((s) => (
                    <option key={`my-${s}`} value={s}>
                      {s}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="All Other Platform Skills">
                {otherSkillsForMe.map((s) => (
                  <option key={`other-me-${s}`} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Skill 2: I Want to Learn - Full width for full text visibility */}
          <div className="field">
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>I Want to Learn (Wanted Skill)</span>
              <span style={{ fontSize: 12, color: "var(--gray)", fontWeight: 500 }}>
                What {targetUser.name.split(" ")[0]} will teach
              </span>
            </label>
            <select
              className="input"
              value={form.want}
              onChange={(e) => {
                setForm({ ...form, want: e.target.value });
                if (error) setError("");
              }}
            >
              {targetTeaches.length > 0 && (
                <optgroup label={`⭐ ${targetUser.name}'s Listed Skills (Recommended)`}>
                  {targetTeaches.map((s) => (
                    <option key={`target-${s}`} value={s}>
                      {s}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="All Other Platform Skills">
                {otherSkillsForPartner.map((s) => (
                  <option key={`other-target-${s}`} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Conflict warning if same skill selected */}
          {form.teach && form.want && form.teach.toLowerCase() === form.want.toLowerCase() && (
            <div
              style={{
                fontSize: 12.5,
                color: "#b91c1c",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                padding: "8px 12px",
                borderRadius: 8,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <FiAlertCircle />
              <span>
                <b>Note:</b> You selected &quot;{form.teach}&quot; for both teaching and learning. Please select two different skills to form a mutual skill swap.
              </span>
            </div>
          )}

          {/* Exchange Mode */}
          <div className="field">
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Exchange Mode</span>
              <span style={{ fontSize: 12, color: "var(--gray)", fontWeight: 500 }}>
                {form.mode === "Online" ? "Remote video sessions" : "In-person public meetings"}
              </span>
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className={`chip ${form.mode === "Online" ? "active" : ""}`}
                style={{ flex: 1, minWidth: 140, justifyContent: "center", padding: "10px 14px", fontSize: 13.5 }}
                onClick={() => setForm({ ...form, mode: "Online" })}
              >
                🌐 Online (Remote)
              </button>
              <button
                type="button"
                className={`chip ${form.mode === "Offline" ? "active" : ""}`}
                style={{ flex: 1, minWidth: 140, justifyContent: "center", padding: "10px 14px", fontSize: 13.5 }}
                onClick={() => setForm({ ...form, mode: "Offline" })}
              >
                📍 Offline (In-Person)
              </button>
            </div>
          </div>

          {/* Sessions & Duration - Clear, fully visible option text */}
          <div className="modal-grid-2">
            <div className="field">
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Total Sessions</span>
                <span style={{ fontSize: 12, color: "var(--gray)", fontWeight: 500 }}>
                  {form.totalSessions} sessions each
                </span>
              </label>
              <select
                className="input"
                value={form.totalSessions}
                onChange={(e) => setForm({ ...form, totalSessions: Number(e.target.value) })}
              >
                <option value={2}>2 Sessions (Sprint)</option>
                <option value={4}>4 Sessions (Standard)</option>
                <option value={6}>6 Sessions (Deep Dive)</option>
                <option value={8}>8 Sessions (Comprehensive)</option>
              </select>
            </div>

            <div className="field">
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Session Duration</span>
                <span style={{ fontSize: 12, color: "var(--gray)", fontWeight: 500 }}>Per session</span>
              </label>
              <select
                className="input"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              >
                <option value="45 Mins">45 Minutes</option>
                <option value="1 Hour">1 Hour (Standard)</option>
                <option value="1.5 Hours">1.5 Hours</option>
                <option value="2 Hours">2 Hours</option>
              </select>
            </div>
          </div>

          {/* Schedule Date & Time */}
          <div className="modal-grid-2">
            <div className="field">
              <label><FiCalendar /> Preferred Start Date</label>
              <input
                type="date"
                className="input"
                min={todayDate}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div className="field">
              <label><FiClock /> Preferred Time Slot</label>
              <select
                className="input"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              >
                <option value="9:00 AM">9:00 AM (Morning)</option>
                <option value="11:00 AM">11:00 AM (Morning)</option>
                <option value="2:00 PM">2:00 PM (Afternoon)</option>
                <option value="4:00 PM">4:00 PM (Evening)</option>
                <option value="5:00 PM">5:00 PM (Evening)</option>
                <option value="6:00 PM">6:00 PM (Evening)</option>
                <option value="7:30 PM">7:30 PM (Night)</option>
              </select>
            </div>
          </div>

          {/* Mode-specific Fields */}
          {form.mode === "Online" ? (
            <div className="field">
              <label><FiVideo /> Online Meeting Link</label>
              <input
                type="url"
                className="input"
                placeholder="https://meet.google.com/... or Zoom link"
                value={form.meetingLink}
                onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
              />
              <span style={{ fontSize: 12, color: "var(--gray)", marginTop: 4, display: "block", lineHeight: 1.4 }}>
                Add a Google Meet, Zoom, or Microsoft Teams meeting link for remote sessions. You can update this anytime.
              </span>
            </div>
          ) : (
            <div className="field">
              <label><FiMapPin /> Offline Meeting Location</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Central Library, Kochi or Campus Cafe"
                value={form.meetingLocation}
                onChange={(e) => setForm({ ...form, meetingLocation: e.target.value })}
              />
              <div
                style={{
                  fontSize: 12.5,
                  color: "#92400e",
                  background: "#fef3c7",
                  padding: "10px 14px",
                  borderRadius: 10,
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  lineHeight: 1.45,
                }}
              >
                <FiShield style={{ flexShrink: 0, fontSize: 16 }} />
                <span><b>Safety Guidance:</b> For in-person learning, always choose a safe and verified public location (such as a library or campus study hall).</span>
              </div>
            </div>
          )}

          {/* Personal Message Note */}
          <div className="field">
            <label>Personal Message (Optional)</label>
            <textarea
              className="input"
              style={{ height: 68, minHeight: 68, resize: "none", fontSize: 13.5, lineHeight: 1.45 }}
              placeholder={`Hi ${(targetUser.name || "").split(" ")[0]}! I would love to learn ${form.want || "your skill"} and teach ${form.teach || "my skill"} in return.`}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>

          {/* Live Structured Agreement Preview */}
          <div
            style={{
              background: "var(--cream)",
              border: "1.5px solid var(--border)",
              borderRadius: 16,
              padding: "16px 18px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: "1px solid var(--border)",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ink)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                📋 Proposed Agreement Summary
              </span>
              <span
                style={{
                  fontSize: 12,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                {form.mode === "Online" ? "🌐 Online" : "📍 Offline"} · {form.totalSessions} Sessions
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, lineHeight: 1.5 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#2e7d32", fontWeight: 700 }}>✓ You Teach:</span>
                  <b style={{ color: "var(--ink)" }}>{form.teach || "Offered Skill"}</b>
                </div>
                <span style={{ fontSize: 12.5, color: "var(--gray)", background: "rgba(255,255,255,0.7)", padding: "1px 8px", borderRadius: 6 }}>
                  {form.totalSessions} sessions · {form.duration} each
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#1565c0", fontWeight: 700 }}>✓ {targetUser.name.split(" ")[0]} Teaches:</span>
                  <b style={{ color: "var(--ink)" }}>{form.want || "Partner Skill"}</b>
                </div>
                <span style={{ fontSize: 12.5, color: "var(--gray)", background: "rgba(255,255,255,0.7)", padding: "1px 8px", borderRadius: 6 }}>
                  {form.totalSessions} sessions · {form.duration} each
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  paddingTop: 6,
                  borderTop: "1px dashed var(--border)",
                  fontSize: 12.5,
                  color: "var(--gray)",
                  flexWrap: "wrap",
                }}
              >
                <span><b>First Session:</b> {form.date} at {form.time}</span>
                <span>•</span>
                <span style={{ wordBreak: "break-all" }}>
                  <b>{form.mode === "Online" ? "Link" : "Location"}:</b>{" "}
                  {form.mode === "Online"
                    ? (form.meetingLink || "https://meet.google.com/sb-exchange-hub")
                    : (form.meetingLocation || "Central Public Library")}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-dark btn-block"
            disabled={submitting || isSelf || (form.teach && form.want && form.teach.toLowerCase() === form.want.toLowerCase())}
            style={{
              padding: "13px 24px",
              fontSize: 14.5,
              fontWeight: 700,
              gap: 8,
              cursor:
                submitting || isSelf || (form.teach && form.want && form.teach.toLowerCase() === form.want.toLowerCase())
                  ? "not-allowed"
                  : "pointer",
              opacity:
                submitting || isSelf || (form.teach && form.want && form.teach.toLowerCase() === form.want.toLowerCase())
                  ? 0.5
                  : 1,
            }}
          >
            <FiSend /> {submitting ? "Sending Proposal..." : "Propose Exchange Agreement"}
          </button>
        </form>
      </div>
    </div>
  );
}
