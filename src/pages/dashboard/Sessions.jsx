import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  FiCalendar, FiClock, FiVideo, FiCheck, FiMapPin, FiExternalLink, FiShield,
  FiEdit2, FiTrash2, FiX, FiAlertCircle
} from "react-icons/fi";
import { SKILLS } from "../../data/dummyData";
import {
  addSession,
  completeSession,
  cancelSession,
  fetchSessionsAsync,
  createSessionAsync,
  completeSessionAsync,
  cancelSessionAsync,
  updateSessionAsync,
} from "../../redux/slices/sessionSlice";
import { fetchUsersAsync } from "../../redux/slices/userSlice";
import { fetchExchangesAsync } from "../../redux/slices/exchangeSlice";
import { addNotification } from "../../redux/slices/notificationSlice";

const TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:30 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:30 PM", "9:00 PM"];
const DURATIONS = ["45 Minutes", "1 Hour", "1.5 Hours", "2 Hours"];

export default function Sessions() {
  const location = useLocation();
  const [tab, setTab] = useState("upcoming");
  const sessions = useSelector((s) => s.sessions.sessions || []);
  const allUsers = useSelector((s) => s.user.users || []);
  const currentUser = useSelector((s) => s.user.currentUser);
  const exchanges = useSelector((s) => s.exchanges?.exchanges || []);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchSessionsAsync());
    dispatch(fetchUsersAsync());
    dispatch(fetchExchangesAsync());
  }, [dispatch]);

  const partnerOptions = (allUsers || []).filter(
    (u) => String(u.id || u._id) !== String(currentUser?.id || currentUser?._id) && u.status !== "Disabled"
  );

  const activeExchanges = (exchanges || []).filter(
    (e) => e.status === "active" || e.status === "accepted"
  );

  const [form, setForm] = useState({
    partner: location.state?.partner || partnerOptions[0]?.name || "Arjun M.",
    skill: location.state?.skill || SKILLS[0],
    topic: "",
    date: "",
    time: "5:00 PM",
    duration: "1 Hour",
    mode: "Online",
    meetingLink: "https://meet.google.com/sb-learn-hub",
    meetingLocation: "Central Public Library, Kochi",
    exchangeId: location.state?.exchangeId || "",
  });

  const [confirm, setConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit / Reschedule state
  const [editingSession, setEditingSession] = useState(null);
  const [editForm, setEditForm] = useState({
    date: "",
    time: "5:00 PM",
    duration: "1 Hour",
    mode: "Online",
    meetingLink: "",
    meetingLocation: "",
    topic: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  // Sync if location state changes
  useEffect(() => {
    if (location.state?.partner) {
      setForm((prev) => ({
        ...prev,
        partner: location.state.partner,
        skill: location.state.skill || prev.skill,
        exchangeId: location.state.exchangeId || prev.exchangeId,
      }));
    }
  }, [location.state]);

  const upcomingSessions = sessions.filter((s) => s.status === "upcoming");
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const cancelledSessions = sessions.filter((s) => s.status === "cancelled");

  const shown = tab === "upcoming"
    ? upcomingSessions
    : tab === "completed"
    ? completedSessions
    : cancelledSessions;

  const schedule = async (e) => {
    e.preventDefault();
    setConfirm("");
    setErrorMessage("");

    if (!form.date) {
      setErrorMessage("Please select a session date.");
      return;
    }

    if (form.date < todayStr) {
      setErrorMessage("Session date cannot be in the past.");
      return;
    }

    if (form.mode === "Online" && (!form.meetingLink || !form.meetingLink.trim())) {
      setErrorMessage("A valid meeting link is required for online sessions.");
      return;
    }

    if (form.mode === "Offline" && (!form.meetingLocation || !form.meetingLocation.trim())) {
      setErrorMessage("A meeting location is required for offline sessions.");
      return;
    }

    const partnerObj = partnerOptions.find(
      (u) => u.name === form.partner || u.fullName === form.partner
    );

    const payload = {
      partnerId: partnerObj?._id || partnerObj?.id,
      partner: form.partner,
      photo: partnerObj?.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      skill: form.skill,
      topic: form.topic,
      date: form.date,
      time: form.time,
      duration: form.duration,
      mode: form.mode === "Offline" ? "In-Person" : "Online Video",
      meetingLink: form.mode === "Online" ? form.meetingLink.trim() : "",
      meetingLocation: form.mode === "Offline" ? form.meetingLocation.trim() : "",
      status: "upcoming",
      exchangeId: form.exchangeId || undefined,
    };

    setSubmitting(true);
    try {
      const resAction = await dispatch(createSessionAsync(payload));
      if (createSessionAsync.fulfilled.match(resAction)) {
        dispatch(
          addNotification({
            type: "session",
            title: "Session Scheduled",
            text: `You scheduled a ${payload.mode} session for ${form.skill} with ${form.partner} on ${form.date} at ${form.time}.`,
          })
        );
        setConfirm(`Session scheduled: ${form.skill} with ${form.partner} on ${form.date} at ${form.time}.`);
        setForm((prev) => ({ ...prev, date: "", topic: "" }));
        setTimeout(() => setConfirm(""), 4500);
      } else {
        setErrorMessage(resAction.payload || "Failed to schedule session.");
      }
    } catch {
      setErrorMessage("Failed to schedule session. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id, skill, partner) => {
    dispatch(completeSession(id));
    try {
      await dispatch(completeSessionAsync(id)).unwrap();
      dispatch(
        addNotification({
          type: "completed",
          title: "Session Completed",
          text: `Your ${skill} session with ${partner} is marked as completed!`,
        })
      );
      dispatch(fetchSessionsAsync());
      dispatch(fetchExchangesAsync());
    } catch (err) {
      dispatch(fetchSessionsAsync());
      alert(err || "Failed to complete session");
    }
  };

  const handleCancel = async (id, skill, partner) => {
    if (!window.confirm(`Are you sure you want to cancel the ${skill} session with ${partner}?`)) {
      return;
    }
    dispatch(cancelSession(id));
    try {
      await dispatch(cancelSessionAsync(id)).unwrap();
      dispatch(
        addNotification({
          type: "session",
          title: "Session Cancelled",
          text: `Your ${skill} session with ${partner} was cancelled.`,
        })
      );
      dispatch(fetchSessionsAsync());
    } catch (err) {
      dispatch(fetchSessionsAsync());
      alert(err || "Failed to cancel session");
    }
  };

  const startEditing = (s) => {
    setEditingSession(s);
    setEditError("");
    setEditForm({
      date: s.date || "",
      time: s.time || "5:00 PM",
      duration: s.duration || "1 Hour",
      mode: (s.mode?.toLowerCase().includes("offline") || s.mode?.toLowerCase().includes("in-person")) ? "Offline" : "Online",
      meetingLink: s.meetingLink || "https://meet.google.com/sb-learn-hub",
      meetingLocation: s.meetingLocation || "Central Public Library, Kochi",
      topic: s.topic || "",
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingSession) return;
    setEditError("");

    if (!editForm.date) {
      setEditError("Please select a date.");
      return;
    }

    if (editForm.date < todayStr) {
      setEditError("Session date cannot be in the past.");
      return;
    }

    if (editForm.mode === "Online" && (!editForm.meetingLink || !editForm.meetingLink.trim())) {
      setEditError("A valid meeting link is required for online sessions.");
      return;
    }

    if (editForm.mode === "Offline" && (!editForm.meetingLocation || !editForm.meetingLocation.trim())) {
      setEditError("A meeting location is required for offline sessions.");
      return;
    }

    setEditSubmitting(true);
    const sid = editingSession._id || editingSession.id;
    try {
      const updates = {
        date: editForm.date,
        time: editForm.time,
        duration: editForm.duration,
        topic: editForm.topic ? editForm.topic.trim() : "",
        mode: editForm.mode === "Offline" ? "In-Person" : "Online Video",
        meetingLink: editForm.mode === "Online" ? editForm.meetingLink.trim() : "",
        meetingLocation: editForm.mode === "Offline" ? editForm.meetingLocation.trim() : "",
      };
      await dispatch(updateSessionAsync({ id: sid, updates })).unwrap();
      dispatch(
        addNotification({
          type: "session",
          title: "Session Rescheduled",
          text: `Rescheduled ${editingSession.skill} session to ${editForm.date} at ${editForm.time}.`,
        })
      );
      setEditingSession(null);
      dispatch(fetchSessionsAsync());
    } catch (err) {
      setEditError(typeof err === "string" ? err : "Failed to update session");
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Sessions & Learning Milestones</h1>
        <p>Schedule, manage, and verify peer-to-peer learning sessions and exchange milestones.</p>
      </div>

      {/* 3 Tabs: Upcoming, Completed, Cancelled */}
      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === "upcoming" ? "active" : ""}`}
          onClick={() => setTab("upcoming")}
        >
          Upcoming Sessions ({upcomingSessions.length})
        </button>
        <button
          type="button"
          className={`tab ${tab === "completed" ? "active" : ""}`}
          onClick={() => setTab("completed")}
        >
          Completed Sessions ({completedSessions.length})
        </button>
        <button
          type="button"
          className={`tab ${tab === "cancelled" ? "active" : ""}`}
          onClick={() => setTab("cancelled")}
        >
          Cancelled Sessions ({cancelledSessions.length})
        </button>
      </div>

      {/* Schedule Form */}
      <div className="dash-panel">
        <div className="panel-title"><h3>Schedule a new session</h3></div>
        {confirm && (
          <div className="success-msg" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <FiCheck /> {confirm}
          </div>
        )}
        {errorMessage && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: 8,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <FiAlertCircle /> {errorMessage}
          </div>
        )}

        <form onSubmit={schedule}>
          <div className="form-grid">
            <div className="field">
              <label>Partner</label>
              <select
                className="input"
                value={form.partner}
                onChange={(e) => setForm({ ...form, partner: e.target.value })}
              >
                {partnerOptions.map((u) => (
                  <option key={u.id || u._id} value={u.name}>
                    {u.name || u.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Skill</label>
              <select
                className="input"
                value={form.skill}
                onChange={(e) => setForm({ ...form, skill: e.target.value })}
              >
                {SKILLS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Topic / Milestone (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Hooks and State Management"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Exchange Mode</label>
              <select
                className="input"
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
              >
                <option value="Online">🌐 Online (Remote Video Call)</option>
                <option value="Offline">📍 Offline (In-Person)</option>
              </select>
            </div>

            <div className="field">
              <label>Date</label>
              <input
                type="date"
                className="input"
                min={todayStr}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label>Time</label>
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
              <label>{form.mode === "Online" ? "Meeting Link" : "Meeting Location"}</label>
              {form.mode === "Online" ? (
                <input
                  type="url"
                  className="input"
                  placeholder="https://meet.google.com/..."
                  value={form.meetingLink}
                  onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                  required
                />
              ) : (
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Central Library, Kochi"
                  value={form.meetingLocation}
                  onChange={(e) => setForm({ ...form, meetingLocation: e.target.value })}
                  required
                />
              )}
            </div>
          </div>

          {form.mode === "Offline" && (
            <div
              style={{
                fontSize: 12.5,
                color: "#92400e",
                background: "#fef3c7",
                padding: "8px 12px",
                borderRadius: 8,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <FiShield />
              <span><b>Safety Guidance:</b> For in-person meetings, choose a well-lit, public learning location such as a university hub or public library.</span>
            </div>
          )}

          <button type="submit" className="btn btn-dark btn-sm" disabled={submitting}>
            <FiCalendar /> {submitting ? "Scheduling..." : "Schedule Session"}
          </button>
        </form>
      </div>

      {/* Session List */}
      <div className="dash-panel">
        <div className="panel-title">
          <h3>
            {tab === "upcoming"
              ? `Upcoming Sessions (${upcomingSessions.length})`
              : tab === "completed"
              ? `Completed Sessions (${completedSessions.length})`
              : `Cancelled Sessions (${cancelledSessions.length})`}
          </h3>
        </div>

        {shown.length === 0 && (
          <p style={{ color: "var(--gray)", fontSize: 14 }}>
            {tab === "upcoming"
              ? "No upcoming sessions scheduled yet. Use the form above to book a peer session!"
              : tab === "completed"
              ? "No completed sessions yet. Once a session is held, mark it complete to track milestones!"
              : "No cancelled sessions."}
          </p>
        )}

        {shown.map((s) => {
          const sid = s._id || s.id;
          const currentUserId = String(currentUser?._id || currentUser?.id || "");
          const sessionCreatorId = String(s.createdBy?._id || s.createdBy || "");
          const isCreator = Boolean(
            s.isCreator !== undefined
              ? s.isCreator
              : ((sessionCreatorId && sessionCreatorId === currentUserId) ||
                 (!sessionCreatorId && s.user && String(s.user._id || s.user) === currentUserId))
          );
          const canManage = Boolean(s.canManage ?? true);

          return (
            <div className="ex-row" key={sid} style={{ display: "block", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 260, flex: 1 }}>
                  <img
                    className="ex-avatar"
                    src={s.photo || s.partnerPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
                    alt={s.partner || s.partnerName}
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
                    }}
                  />
                  <div className="ex-info">
                    <div className="ex-name" style={{ fontSize: 15.5 }}>
                      {s.skill} with {s.partner || s.partnerName}
                      {s.topic ? <span style={{ fontWeight: 400, color: "var(--gray)", fontSize: 13.5 }}> — {s.topic}</span> : null}
                    </div>
                    <div className="ex-meta" style={{ flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                      <span className="date-chip"><FiCalendar /> {s.date}</span>
                      <span className="date-chip"><FiClock /> {s.time} ({s.duration || "1 Hour"})</span>
                      {s.mode?.includes("In-Person") || s.meetingLocation ? (
                        <span className="date-chip"><FiMapPin /> {s.meetingLocation || "Offline"}</span>
                      ) : (
                        <span className="date-chip"><FiVideo /> Online</span>
                      )}
                      {!isCreator && (
                        <span className="date-chip" style={{ background: "#f3f4f6", color: "#6b7280" }}>
                          Scheduled by partner
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {s.status === "upcoming" && (s.meetingLink || !s.meetingLocation) && (
                    <a
                      href={s.meetingLink || "https://meet.google.com/sb-learn-hub"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-xs"
                    >
                      <FiExternalLink /> JOIN SESSION
                    </a>
                  )}

                  <span
                    className={`status-pill ${
                      s.status === "upcoming"
                        ? "st-pending"
                        : s.status === "completed"
                        ? "st-completed"
                        : "st-rejected"
                    }`}
                    style={
                      s.status === "cancelled"
                        ? { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }
                        : {}
                    }
                  >
                    {s.status === "upcoming"
                      ? "Upcoming"
                      : s.status === "completed"
                      ? "Completed ✓"
                      : "Cancelled ✕"}
                  </span>

                  {/* Actions for Upcoming Sessions */}
                  {s.status === "upcoming" && canManage && (
                    <>
                      <button
                        type="button"
                        className="btn-xs"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                        }}
                        onClick={() => startEditing(s)}
                        title="Reschedule session"
                      >
                        <FiEdit2 /> Reschedule
                      </button>
                      <button
                        type="button"
                        className="btn-xs dark"
                        onClick={() => handleComplete(sid, s.skill, s.partner || s.partnerName)}
                        title="Mark session as completed"
                      >
                        <FiCheck /> Complete
                      </button>
                      <button
                        type="button"
                        className="btn-xs"
                        style={{
                          background: "transparent",
                          color: "#dc2626",
                          border: "1px solid #fca5a5",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                        }}
                        onClick={() => handleCancel(sid, s.skill, s.partner || s.partnerName)}
                        title="Cancel this session"
                      >
                        <FiTrash2 /> Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Inline Reschedule / Edit Drawer */}
              {editingSession && (editingSession._id === sid || editingSession.id === sid) && (
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: 16,
                    marginTop: 14,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 14.5 }}>Reschedule Session: {s.skill}</h4>
                    <button
                      type="button"
                      onClick={() => setEditingSession(null)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray)", fontSize: 16 }}
                      aria-label="Close"
                    >
                      <FiX />
                    </button>
                  </div>

                  {editError && (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "#fee2e2",
                        color: "#991b1b",
                        borderRadius: 8,
                        fontSize: 12.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 12,
                      }}
                    >
                      <FiAlertCircle /> {editError}
                    </div>
                  )}

                  <form onSubmit={handleUpdate}>
                    <div className="form-grid" style={{ marginBottom: 12 }}>
                      <div className="field">
                        <label>New Date</label>
                        <input
                          type="date"
                          className="input"
                          min={todayStr}
                          value={editForm.date}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="field">
                        <label>New Time</label>
                        <select
                          className="input"
                          value={editForm.time}
                          onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                        >
                          {TIMES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Duration</label>
                        <select
                          className="input"
                          value={editForm.duration}
                          onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                        >
                          {DURATIONS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Topic / Milestone</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. Advanced Component Patterns"
                          value={editForm.topic}
                          onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label>Mode</label>
                        <select
                          className="input"
                          value={editForm.mode}
                          onChange={(e) => setEditForm({ ...editForm, mode: e.target.value })}
                        >
                          <option value="Online">Online Video</option>
                          <option value="Offline">Offline (In-Person)</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>{editForm.mode === "Online" ? "Meeting Link" : "Meeting Location"}</label>
                        {editForm.mode === "Online" ? (
                          <input
                            type="url"
                            className="input"
                            value={editForm.meetingLink}
                            onChange={(e) => setEditForm({ ...editForm, meetingLink: e.target.value })}
                            required
                          />
                        ) : (
                          <input
                            type="text"
                            className="input"
                            value={editForm.meetingLocation}
                            onChange={(e) => setEditForm({ ...editForm, meetingLocation: e.target.value })}
                            required
                          />
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => setEditingSession(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-dark btn-xs"
                        disabled={editSubmitting}
                      >
                        {editSubmitting ? "Saving..." : "Save Rescheduled Time"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
