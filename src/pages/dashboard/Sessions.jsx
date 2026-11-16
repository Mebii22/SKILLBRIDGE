import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FiCalendar, FiClock, FiVideo, FiCheck, FiMapPin, FiExternalLink, FiShield } from "react-icons/fi";
import { SKILLS } from "../../data/dummyData";
import { addSession, completeSession } from "../../redux/slices/sessionSlice";
import { addNotification } from "../../redux/slices/notificationSlice";

const TIMES = ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:30 PM", "9:00 PM"];

export default function Sessions() {
  const [tab, setTab] = useState("upcoming");
  const sessions = useSelector((s) => s.sessions.sessions);
  const allUsers = useSelector((s) => s.user.users);
  const currentUser = useSelector((s) => s.user.currentUser);
  const dispatch = useDispatch();

  const partnerOptions = (allUsers || []).filter(
    (u) => String(u.id) !== String(currentUser?.id) && u.status !== "Disabled"
  );

  const [form, setForm] = useState({
    partner: partnerOptions[0]?.name || "Arjun M.",
    skill: SKILLS[0],
    date: "",
    time: TIMES[3],
    mode: "Online",
    meetingLink: "https://meet.google.com/sb-learn-hub",
    meetingLocation: "Central Public Library, Kochi",
  });
  const [confirm, setConfirm] = useState("");

  const shown = (sessions || []).filter((s) => s.status === tab);

  const schedule = (e) => {
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
    };

    dispatch(addSession(newSession));
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
  };

  const handleComplete = (id, skill, partner) => {
    dispatch(completeSession(id));
    dispatch(
      addNotification({
        type: "completed",
        title: "Session completed",
        text: `Your ${skill} session with ${partner} is marked as completed.`,
      })
    );
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
                {partnerOptions.map((u) => <option key={u.id}>{u.name}</option>)}
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

          <button type="submit" className="btn btn-dark btn-sm"><FiCalendar /> Schedule Session</button>
        </form>
      </div>

      {/* Session List */}
      <div className="dash-panel">
        <div className="panel-title"><h3>{tab === "upcoming" ? "Upcoming Sessions" : "Completed Sessions"}</h3></div>
        {shown.length === 0 && <p style={{ color: "var(--gray)", fontSize: 14 }}>No sessions here yet.</p>}
        {shown.map((s) => (
          <div className="ex-row" key={s.id}>
            <img className="ex-avatar" src={s.photo} alt={s.partner} />
            <div className="ex-info">
              <div className="ex-name">{s.skill} with {s.partner}</div>
              <div className="ex-meta">
                <span className="date-chip"><FiCalendar /> {s.date}</span>
                <span className="date-chip"><FiClock /> {s.time}</span>
                {s.mode?.includes("In-Person") || s.meetingLocation ? (
                  <span className="date-chip"><FiMapPin /> {s.meetingLocation || "Offline"}</span>
                ) : (
                  <span className="date-chip"><FiVideo /> Online</span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
              {s.status === "upcoming" && (
                <button
                  className="btn-xs dark"
                  onClick={() => handleComplete(s.id, s.skill, s.partner)}
                >
                  Mark Complete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}