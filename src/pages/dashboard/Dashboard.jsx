import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiRepeat, FiCalendar, FiArrowUpRight, FiArrowDownLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import { sendRequest } from "../../redux/slices/exchangeSlice";
import { addNotification } from "../../redux/slices/notificationSlice";
import { calculateMatchScore } from "../../utils/matching";

export default function Dashboard() {
  const user = useSelector((s) => s.user.currentUser);
  const exchanges = useSelector((s) => s.exchanges.exchanges);
  const sessions = useSelector((s) => s.sessions.sessions);
  const allUsers = useSelector((s) => s.user.users);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [sentIds, setSentIds] = useState([]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const active = exchanges.filter((e) => e.status === "active");
  const upcoming = sessions.filter((s) => s.status === "upcoming");

  const recommended = [...allUsers]
    .filter((u) => String(u.id) !== String(user?.id) && u.status !== "Disabled")
    .sort((a, b) => calculateMatchScore(user, b).score - calculateMatchScore(user, a).score)
    .slice(0, 3);

  const connect = (u) => {
    const teachSkill = (u.teaches && u.teaches[0]) || "General Skills";
    const wantSkill = (u.wants && u.wants[0]) || "New Skills";
    dispatch(
      sendRequest({
        partnerId: u.id,
        partnerName: u.name,
        partnerPhoto: u.photo,
        teach: teachSkill,
        want: wantSkill,
      })
    );
    dispatch(
      addNotification({
        type: "request",
        title: "Exchange request sent",
        text: `You sent an exchange request to ${u.name}.`,
      })
    );
    setSentIds([...sentIds, u.id]);
  };

  const stats = [
    { label: "Active Exchanges", value: active.length, icon: <FiRepeat /> },
    { label: "Upcoming Sessions", value: upcoming.length, icon: <FiCalendar /> },
    { label: "Skills Offered", value: user?.teaches?.length || 0, icon: <FiArrowUpRight /> },
    { label: "Skills Learning", value: user?.wants?.length || 0, icon: <FiArrowDownLeft /> },
  ];

  return (
    <>
      <div className="page-head">
        <h1>{greeting}, {user?.name || "Learner"}.</h1>
        <p>Here’s what’s happening with your learning today.</p>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-top">
              <span className="stat-label">{s.label}</span>
              <span className="stat-icon">{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="dash-panel">
        <div className="panel-title">
          <h3>Continue Learning</h3>
          <Link to="/exchanges" className="panel-link">All exchanges <FiArrowRight /></Link>
        </div>
        {active.length === 0 && <p style={{ color: "var(--gray)", fontSize: 14 }}>No active exchanges yet — find a partner in Discover.</p>}
        {active.map((ex) => (
          <div className="ex-row" key={ex.id}>
            <img className="ex-avatar" src={ex.partnerPhoto} alt={ex.partnerName} />
            <div className="ex-info">
              <div className="ex-name">{ex.teach} ↔ {ex.want}</div>
              <div className="ex-swap">Partner: <b>{ex.partnerName}</b></div>
              <div className="progress"><i style={{ width: `${ex.progress}%` }} /></div>
            </div>
            <span className="status-pill st-active">{ex.progress}%</span>
            <Link to={`/exchanges/${ex.id}`} className="btn-xs dark">Open</Link>
          </div>
        ))}
      </div>

      <div className="dash-panel">
        <div className="panel-title">
          <h3>Upcoming Sessions</h3>
          <Link to="/sessions" className="panel-link">Schedule <FiArrowRight /></Link>
        </div>
        {upcoming.length === 0 && (
          <p style={{ color: "var(--gray)", fontSize: 14 }}>No upcoming sessions yet — schedule one anytime.</p>
        )}
        {upcoming.map((s) => (
          <div className="ex-row" key={s.id}>
            <img className="ex-avatar" src={s.photo} alt={s.partner} />
            <div className="ex-info">
              <div className="ex-name">{s.skill} with {s.partner}</div>
              <div className="ex-meta">
                <span className="date-chip"><FiCalendar /> {s.date}</span>
                <span className="date-chip">{s.time}</span>
                <span className="date-chip">{s.mode}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-panel">
        <div className="panel-title">
          <h3>Recommended People</h3>
          <Link to="/discover" className="panel-link">Discover more <FiArrowRight /></Link>
        </div>
        {recommended.length === 0 && (
          <p style={{ color: "var(--gray)", fontSize: 14 }}>Check back soon for new member recommendations.</p>
        )}
        {recommended.map((u) => {
          const matchInfo = calculateMatchScore(user, u);
          return (
            <div className="ex-row" key={u.id}>
              <img className="ex-avatar" src={u.photo} alt={u.name} />
              <div className="ex-info">
                <div className="ex-name">{u.name}</div>
                <div className="ex-swap">
                  Teaches <b>{(u.teaches || []).join(", ") || "None"}</b> · Wants <b>{(u.wants || []).join(", ") || "None"}</b>
                </div>
              </div>
              <span className="match-badge" title={matchInfo.label}>
                {matchInfo.icon} {matchInfo.score}% Match
              </span>
              {sentIds.includes(u.id) ? (
                <span className="btn-xs" style={{ background: "var(--yellow)", borderColor: "var(--yellow)" }}>
                  <FiCheck /> Request Sent
                </span>
              ) : (
                <button className="btn-xs dark" onClick={() => connect(u)}>Connect</button>
              )}
              <button className="btn-xs" onClick={() => navigate(`/profile/${u.id}`)}>View</button>
            </div>
          );
        })}
      </div>
    </>
  );
}
