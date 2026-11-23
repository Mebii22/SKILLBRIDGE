import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  FiCalendar, FiClock, FiVideo, FiCheck, FiMapPin, FiExternalLink, FiShield,
  FiEdit2, FiTrash2, FiX
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
import { addNotification } from "../../redux/slices/notificationSlice";

const TIMES = ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:30 PM", "9:00 PM"];

export default function Sessions() {
  const location = useLocation();
  const [tab, setTab] = useState("upcoming");
  const sessions = useSelector((s) => s.sessions.sessions);
  const allUsers = useSelector((s) => s.user.users);
  const currentUser = useSelector((s) => s.user.currentUser);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchSessionsAsync());
    dispatch(fetchUsersAsync());
  }, [dispatch]);

  const partnerOptions = (allUsers || []).filter(
    (u) => String(u.id || u._id) !== String(currentUser?.id || currentUser?._id) && u.status !== "Disabled"
  );

  const [form, setForm] = useState({
    partner: location.state?.partner || partnerOptions[0]?.name || "Arjun M.",
    skill: location.state?.skill || SKILLS[0],
    date: "",
    time: TIMES[3],
    mode: "Online",
    meetingLink: "https://meet.google.com/sb-learn-hub",
    meetingLocation: "Central Public Library, Kochi",
  });
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit / Reschedule state
  const [editingSession, setEditingSession] = useState(null);
  const [editForm, setEditForm] = useState({
    date: "",
    time: TIMES[3],
    mode: "Online",
    meetingLink: "",
    meetingLocation: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Sync if location state changes
  useEffect(() => {
    if (location.state?.partner) {
      setForm((prev) => ({
        ...prev,
        partner: location.state.partner,
        skill: location.state.skill || prev.skill,
      }));
    }
  }, [location.state]);

  const shown = (sessions || []).filter((s) => s.status === tab);

  const schedule = async (e) => {
    e.preventDefault();
    if (!form.date) {
      setConfirm("Please pick a date first.");
      return;
    }
    const partnerObj = partnerOptions.find((u) => u.name === form.partner);
    const newSession = {
      partner: form.partner,
      photo: partnerObj?.photo || "https://randomuser.me/api/portraits/men/32.jpg",
      skill: form.skill,
      date: form.date,
      time: form.time,
      mode: form.mode === "Offline" ? "In-Person" : "Online Video",
      meetingLink: form.mode === "Online" ? form.meetingLink : undefined,
      meetingLocation: form.mode === "Offline" ? form.meetingLocation : undefined,
      status: "upcoming",
      partnerId: partnerObj?._id || partnerObj?.id,
      exchangeId: location.state?.exchangeId || undefined,
    };

    setSubmitting(true);
    try {
      const resAction = await dispatch(createSessionAsync(newSession));
      if (createSessionAsync.fulfilled.match(resAction)) {
        dispatch(
          addNotification({
            type: "session",
            title: "Session scheduled",
            text: `You scheduled a ${form.mode} ${form.skill} session with ${form.partner} for ${form.date} at ${form.time}.`,
          })
        );
        setConfirm(`Session scheduled: ${form.skill} with ${form.partner} on ${form.date} at ${form.time}.`);
        setForm({ ...form, date: "" });
        setTimeout(() => setConfirm(""), 4000);
      } else {
        setConfirm(resAction.payload || "Failed to schedule session.");
      }
    } catch {
      setConfirm("Failed to schedule session. Please try again.");
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
          title: "Session completed",
          text: `Your ${skill} session with ${partner} is marked as completed.`,
        })
      );
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
          title: "Session cancelled",
          text: `Your ${skill} session with ${partner} was cancelled.`,
        })
      );
    } catch (err) {
      dispatch(fetchSessionsAsync());
      alert(err || "Failed to cancel session");
    }
  };

  const startEditing = (s) => {
    const sessionCreatorId = String(s.createdBy?._id || s.createdBy || "");
    const currentUserId = String(currentUser?._id || currentUser?.id || "");
    const isSessionCreator = Boolean(
      s.isCreator !== undefined
        ? s.isCreator
        : ((sessionCreatorId && sessionCreatorId === currentUserId) ||
           (!sessionCreatorId && s.user && String(s.user._id || s.user) === currentUserId))
    );
    if (!isSessionCreator) return;

    setEditingSession(s);
    setEditForm({
      date: s.date || "",
      time: s.time || TIMES[3],
      mode: s.mode?.toLowerCase().includes("offline") || s.mode?.toLowerCase().includes("in-person") ? "Offline" : "Online",
      meetingLink: s.meetingLink || "https://meet.google.com/sb-learn-hub",
      meetingLocation: s.meetingLocation || "Central Public Library, Kochi",
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingSession) return;
    if (!editForm.date) {
      alert("Please select a date.");
      return;
    }
    setEditSubmitting(true);
    const sid = editingSession._id || editingSession.id;
    try {
      const updates = {
        date: editForm.date,
        time: editForm.time,
        mode: editForm.mode === "Offline" ? "In-Person" : "Online Video",
        meetingLink: editForm.mode === "Online" ? editForm.meetingLink : "",
        meetingLocation: editForm.mode === "Offline" ? editForm.meetingLocation : "",
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
      alert(err || "Failed to update session");
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Sessions</h1>
        <p>Schedule and track your remote and in-person learning sessions.</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "upcoming" ? "active" : ""}`} onClick={() => setTab("upcoming")}>
          Upcoming ({sessions.filter((s) => s.status === "upcoming").length})
        </button>
        <button className={`tab ${tab === "completed" ? "active" : ""}`} onClick={() => setTab("completed")}>
          Completed ({sessions.filter((s) => s.status === "completed").length})
        </button>
      </div>

      {/* Schedule Form */}
      <div className="dash-panel">
        <div className="panel-title"><h3>Schedule a new session</h3></div>
        {confirm && <div className="success-msg"><FiCheck /> {confirm}</div>}
        <form onSubmit={schedule}>
          <div className="form-grid">
            <div className="field">
              <label>Partner</label>
              <select className="input" value={form.partner} onChange={(e) => setForm({ ...form, partner: e.target.value })}>
                {partnerOptions.map((u) => <option key={u.id || u._id}>{u.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Skill</label>
              <select className="input" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })}>
                {SKILLS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Exchange Mode</label>
              <select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                <option value="Online">🌐 Online (Remote Video Call)</option>
                <option value="Offline">📍 Offline (In-Person)</option>
              </select>
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field">
              <label>Time</label>
              <select className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
                {TIMES.map((t) => <option key={t}>{t}</option>)}
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
                />
              ) : (
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Public Library, Kochi"
                  value={form.meetingLocation}
                  onChange={(e) => setForm({ ...form, meetingLocation: e.target.value })}
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
              <span><b>Safety Guidance:</b> For your safety, choose a public and comfortable meeting location.</span>
            </div>
          )}

          <button type="submit" className="btn btn-dark btn-sm" disabled={submitting}>
            <FiCalendar /> {submitting ? "Scheduling..." : "Schedule Session"}
          </button>
        </form>
      </div>

      {/* Session List */}
      <div className="dash-panel">
        <div className="panel-title"><h3>{tab === "upcoming" ? "Upcoming Sessions" : "Completed Sessions"}</h3></div>
        {shown.length === 0 && <p style={{ color: "var(--gray)", fontSize: 14 }}>No sessions here yet.</p>}
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

          return (
            <div className="ex-row" key={sid} style={{ display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 240, flex: 1 }}>
                  <img className="ex-avatar" src={s.photo} alt={s.partner} />
                  <div className="ex-info">
                    <div className="ex-name">{s.skill} with {s.partner}</div>
                    <div className="ex-meta" style={{ flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                      <span className="date-chip"><FiCalendar /> {s.date}</span>
                      <span className="date-chip"><FiClock /> {s.time}</span>
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
                  <span className={`status-pill ${s.status === "upcoming" ? "st-pending" : "st-completed"}`}>
                    {s.status === "upcoming" ? "Upcoming" : "Completed ✓"}
                  </span>

                  {/* Creator-only Action Controls */}
                  {s.status === "upcoming" && isCreator && (
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
                        }}
                        onClick={() => startEditing(s)}
                        title="Reschedule session"
                      >
                        <FiEdit2 /> Reschedule
                      </button>
                      <button
                        type="button"
                        className="btn-xs dark"
                        onClick={() => handleComplete(sid, s.skill, s.partner)}
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
                        }}
                        onClick={() => handleCancel(sid, s.skill, s.partner)}
                        title="Cancel this session"
                      >
                        <FiTrash2 /> Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Inline Reschedule / Edit Drawer for Creator */}
              {editingSession && isCreator && (editingSession._id === sid || editingSession.id === sid) && (
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

                  <form onSubmit={handleUpdate}>
                    <div className="form-grid" style={{ marginBottom: 12 }}>
                      <div className="field">
                        <label>New Date</label>
                        <input
                          type="date"
                          className="input"
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
                          {TIMES.map((t) => <option key={t}>{t}</option>)}
                        </select>
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
                          />
                        ) : (
                          <input
                            type="text"
                            className="input"
                            value={editForm.meetingLocation}
                            onChange={(e) => setEditForm({ ...editForm, meetingLocation: e.target.value })}
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