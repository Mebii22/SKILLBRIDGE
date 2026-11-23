import { useState } from "react";
import { useDispatch } from "react-redux";
import { FiX, FiCalendar, FiClock, FiVideo, FiMapPin, FiCheck, FiAlertCircle } from "react-icons/fi";
import { createSessionAsync } from "../redux/slices/sessionSlice";
import { addNotification } from "../redux/slices/notificationSlice";

const TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:30 PM", "9:00 PM"];
const DURATIONS = ["45 Minutes", "1 Hour", "1.5 Hours", "2 Hours"];

export default function ScheduleSessionModal({
  isOpen,
  onClose,
  partnerName,
  partnerId,
  partnerPhoto,
  defaultSkill = "Skill Practice",
  exchangeId = null,
  onSuccess = null,
}) {
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    skill: defaultSkill,
    date: "",
    time: "5:00 PM",
    duration: "1 Hour",
    mode: "Online Video",
    meetingLink: "https://meet.google.com/sb-learn-hub",
    meetingLocation: "Central Public Library, Kochi",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) {
      setError("Please choose a valid session date.");
      return;
    }
    if (!form.skill.trim()) {
      setError("Please specify the session topic or skill.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      partnerId,
      partner: partnerName,
      photo: partnerPhoto || "https://randomuser.me/api/portraits/men/32.jpg",
      skill: form.skill.trim(),
      date: form.date,
      time: form.time,
      duration: form.duration,
      mode: form.mode,
      meetingLink: form.mode.includes("Online") ? form.meetingLink : undefined,
      meetingLocation: form.mode.includes("Offline") || form.mode.includes("In-Person") ? form.meetingLocation : undefined,
      exchangeId: exchangeId || undefined,
    };

    try {
      const resAction = await dispatch(createSessionAsync(payload));
      if (createSessionAsync.fulfilled.match(resAction)) {
        dispatch(
          addNotification({
            type: "session",
            title: "Session scheduled",
            text: `You scheduled a ${form.mode} ${form.skill} session with ${partnerName} for ${form.date} at ${form.time}.`,
          })
        );
        if (onSuccess) onSuccess(resAction.payload);
        onClose();
      } else {
        setError(resAction.payload || "Failed to schedule session. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(17, 17, 17, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="dash-panel"
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          position: "relative",
          margin: 0,
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "none",
            border: "none",
            fontSize: 20,
            cursor: "pointer",
            color: "var(--gray)",
          }}
          aria-label="Close modal"
        >
          <FiX />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div className="pc-photo-wrap" style={{ width: 48, height: 48, flexShrink: 0 }}>
            <img src={partnerPhoto || "https://randomuser.me/api/portraits/men/32.jpg"} alt={partnerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, margin: 0 }}>Schedule a Session</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--gray)" }}>
              with <b>{partnerName}</b>
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fee2e2",
              color: "#991b1b",
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <FiAlertCircle style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Topic / Skill to Practice</label>
            <input
              type="text"
              className="input"
              value={form.skill}
              onChange={(e) => setForm({ ...form, skill: e.target.value })}
              placeholder="e.g. React Hooks Workshop or Python Basics"
              required
            />
          </div>

          <div className="skill-form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label><FiCalendar /> Date</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label><FiClock /> Start Time</label>
              <select
                className="input"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              >
                {TIMES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="skill-form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Duration</label>
              <select
                className="input"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Exchange Mode</label>
              <select
                className="input"
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
              >
                <option value="Online Video">🌐 Online Video</option>
                <option value="In-Person">📍 Offline / In-Person</option>
              </select>
            </div>
          </div>

          {form.mode.includes("Online") ? (
            <div className="field">
              <label><FiVideo /> Meeting Link</label>
              <input
                type="url"
                className="input"
                value={form.meetingLink}
                onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/..."
              />
            </div>
          ) : (
            <div className="field">
              <label><FiMapPin /> Meeting Location</label>
              <input
                type="text"
                className="input"
                value={form.meetingLocation}
                onChange={(e) => setForm({ ...form, meetingLocation: e.target.value })}
                placeholder="e.g. Central Public Library, Kochi"
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-dark btn-sm"
              disabled={submitting}
            >
              <FiCalendar /> {submitting ? "Scheduling..." : "Confirm & Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

