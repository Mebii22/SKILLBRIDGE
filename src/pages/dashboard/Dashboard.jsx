import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiRepeat,
  FiCalendar,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiArrowRight,
  FiCheck,
  FiClock,
  FiCheckCircle,
  FiPlus,
  FiCompass,
  FiMessageSquare,
  FiUser,
  FiActivity,
  FiSearch
} from "react-icons/fi";
import {
  sendRequest,
  createExchangeAsync,
  fetchExchangesAsync,
  acceptExchangeAsync,
  rejectExchangeAsync,
  cancelExchangeAsync
} from "../../redux/slices/exchangeSlice";
import { fetchSessionsAsync } from "../../redux/slices/sessionSlice";
import { fetchUsersAsync, fetchMeAsync } from "../../redux/slices/userSlice";
import { addNotification, fetchNotificationsAsync } from "../../redux/slices/notificationSlice";
import { calculateMatchScore } from "../../utils/matching";

export default function Dashboard() {
  const user = useSelector((s) => s.user.currentUser);
  const exchanges = useSelector((s) => s.exchanges.exchanges || []);
  const sessions = useSelector((s) => s.sessions.sessions || []);
  const notifications = useSelector((s) => s.notifications.items || []);
  const allUsers = useSelector((s) => s.user.users || []);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [sentIds, setSentIds] = useState([]);
  const [toastMsg, setToastMsg] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [connectingId, setConnectingId] = useState(null);

  useEffect(() => {
    dispatch(fetchMeAsync());
    dispatch(fetchExchangesAsync());
    dispatch(fetchSessionsAsync());
    dispatch(fetchUsersAsync());
    dispatch(fetchNotificationsAsync());
  }, [dispatch]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const userPhoto = user?.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
  const displayName = user?.fullName || user?.name || "Learner";

  // Data Classification from Actual Authenticated User Data
  const active = exchanges.filter((e) => e.status === "active" || e.status === "accepted");
  const pendingTotal = exchanges.filter((e) => e.status === "pending");
  const pendingIncoming = exchanges.filter((e) => e.status === "pending" && !e.isRequester);
  const pendingOutgoing = exchanges.filter((e) => e.status === "pending" && e.isRequester);
  const completed = exchanges.filter((e) => e.status === "completed");
  const upcoming = sessions.filter((s) => s.status === "upcoming");

  const teachesSkills = Array.isArray(user?.teaches) ? user.teaches : [];
  const wantsSkills = Array.isArray(user?.wants) ? user.wants : [];

  const recommended = [...allUsers]
    .filter((u) => String(u.id || u._id) !== String(user?.id || user?._id) && u.status !== "Disabled")
    .sort((a, b) => calculateMatchScore(user, b).score - calculateMatchScore(user, a).score)
    .slice(0, 3);

  const connect = async (u) => {
    const targetUserId = u.id || u._id;
    if (!targetUserId || connectingId || sentIds.includes(targetUserId)) return;

    const teachSkill = (teachesSkills && teachesSkills[0]) || "General Skills";
    const wantSkill = (u.wants && u.wants[0]) || (u.teaches && u.teaches[0]) || "New Skills";

    setConnectingId(targetUserId);

    try {
      // Backend API persistence: single reliable exchange creation with valid MongoDB ObjectId
      await dispatch(
        createExchangeAsync({
          partnerId: targetUserId,
          teach: teachSkill,
          want: wantSkill,
        })
      ).unwrap();

      dispatch(
        addNotification({
          type: "request",
          title: "Exchange request sent",
          text: `You sent an exchange request to ${u.fullName || u.name}.`,
        })
      );
      setSentIds((prev) => [...prev, targetUserId]);
      showToast(`Exchange request sent to ${u.fullName || u.name}!`);
    } catch (err) {
      console.error("Connect error:", err);
      showToast(typeof err === "string" ? err : "Failed to propose skill swap. Please try again.");
    } finally {
      setConnectingId(null);
    }
  };

  const handleAcceptRequest = async (id, partnerName) => {
    try {
      setActionLoadingId(id);
      await dispatch(acceptExchangeAsync(id)).unwrap();
      setActionLoadingId(null);
      showToast(`Exchange agreement with ${partnerName || "partner"} accepted!`);
      dispatch(fetchExchangesAsync());
    } catch (err) {
      setActionLoadingId(null);
      showToast(typeof err === "string" ? err : "Failed to accept exchange request.");
    }
  };

  const handleRejectRequest = async (id, partnerName) => {
    try {
      setActionLoadingId(id);
      await dispatch(rejectExchangeAsync(id)).unwrap();
      setActionLoadingId(null);
      showToast(`Exchange request from ${partnerName || "partner"} declined.`);
      dispatch(fetchExchangesAsync());
    } catch (err) {
      setActionLoadingId(null);
      showToast(typeof err === "string" ? err : "Failed to decline exchange request.");
    }
  };

  const handleCancelRequest = async (id, partnerName) => {
    try {
      setActionLoadingId(id);
      await dispatch(cancelExchangeAsync(id)).unwrap();
      setActionLoadingId(null);
      showToast(`Cancelled proposal to ${partnerName || "partner"}.`);
      dispatch(fetchExchangesAsync());
    } catch (err) {
      setActionLoadingId(null);
      showToast(typeof err === "string" ? err : "Failed to cancel proposal.");
    }
  };

  // 6 Complete Statistics directly from actual authenticated user data
  const stats = [
    {
      label: "Skills Offered",
      value: teachesSkills.length,
      sub: teachesSkills.length > 0 ? teachesSkills.slice(0, 2).join(", ") : "No skills listed",
      icon: <FiArrowUpRight />,
    },
    {
      label: "Skills Wanted",
      value: wantsSkills.length,
      sub: wantsSkills.length > 0 ? wantsSkills.slice(0, 2).join(", ") : "No skills listed",
      icon: <FiArrowDownLeft />,
    },
    {
      label: "Active Exchanges",
      value: active.length,
      sub: active.length > 0 ? `${active.length} active swap${active.length === 1 ? "" : "s"}` : "No active swaps",
      icon: <FiRepeat />,
    },
    {
      label: "Pending Requests",
      value: pendingTotal.length,
      sub: `${pendingIncoming.length} incoming · ${pendingOutgoing.length} outgoing`,
      icon: <FiClock />,
    },
    {
      label: "Completed Exchanges",
      value: completed.length,
      sub: completed.length > 0 ? "Successfully completed" : "None completed yet",
      icon: <FiCheckCircle />,
    },
    {
      label: "Upcoming Sessions",
      value: upcoming.length,
      sub: upcoming.length > 0 ? `${upcoming.length} scheduled` : "None scheduled",
      icon: <FiCalendar />,
    },
  ];

  return (
    <>
      {/* 1. Welcome Section */}
      <div className="welcome-box">
        <div className="welcome-profile">
          <img
            className="welcome-avatar"
            src={userPhoto}
            alt={displayName}
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
            }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="status-pill st-active" style={{ fontSize: 11, padding: "2px 10px", background: "var(--cream)", border: "1px solid var(--border)" }}>
                Peer-to-Peer Learning
              </span>
            </div>
            <h1 style={{ margin: "4px 0 2px" }}>{greeting}, {displayName}.</h1>
            <p style={{ margin: 0, color: "var(--gray)", fontSize: 14.5 }}>
              {active.length > 0 || upcoming.length > 0
                ? `You have ${active.length} active exchange${active.length === 1 ? "" : "s"} and ${upcoming.length} upcoming session${upcoming.length === 1 ? "" : "s"} scheduled.`
                : "Welcome to your personal SkillBridge hub. Learn, teach, and exchange skills with peers."}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link to="/discover" className="btn btn-dark btn-sm">
            <FiSearch style={{ marginRight: 6 }} /> Discover Partners
          </Link>
          <Link to="/my-profile" className="btn btn-outline btn-sm">
            <FiUser style={{ marginRight: 6 }} /> My Profile
          </Link>
        </div>
      </div>

      {/* 2. Statistics Grid (6 Cards) */}
      <div className="stat-grid-6">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-top">
              <span className="stat-label">{s.label}</span>
              <span className="stat-icon">{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
            {s.sub && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--gray)",
                  marginTop: 6,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={s.sub}
              >
                {s.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 5. Quick Actions */}
      <div className="dash-panel" style={{ padding: "18px 22px", marginBottom: 28 }}>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray)", margin: 0 }}>
            Quick Actions
          </h3>
        </div>
        <div className="quick-actions-grid">
          <Link to="/my-profile" className="quick-action-card">
            <div className="quick-action-icon">
              <FiPlus />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14.5 }}>Share a Skill</div>
              <div style={{ fontSize: 12, color: "var(--gray)" }}>Add or update skills you teach</div>
            </div>
          </Link>

          <Link to="/discover" className="quick-action-card">
            <div className="quick-action-icon">
              <FiCompass />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14.5 }}>Discover Skills</div>
              <div style={{ fontSize: 12, color: "var(--gray)" }}>Explore partners & smart matches</div>
            </div>
          </Link>

          <Link to="/exchanges" className="quick-action-card">
            <div className="quick-action-icon">
              <FiRepeat />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14.5 }}>View Exchanges</div>
              <div style={{ fontSize: 12, color: "var(--gray)" }}>Track all proposals & progress</div>
            </div>
          </Link>

          <Link to="/messages" className="quick-action-card">
            <div className="quick-action-icon">
              <FiMessageSquare />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14.5 }}>View Messages</div>
              <div style={{ fontSize: 12, color: "var(--gray)" }}>Communicate with swap partners</div>
            </div>
          </Link>
        </div>
      </div>

      {/* 7. Pending Requests Panel */}
      <div className="dash-panel">
        <div className="panel-title">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3>Pending Exchange Requests</h3>
            {pendingIncoming.length > 0 && (
              <span className="status-pill st-pending" style={{ fontSize: 11, padding: "3px 10px" }}>
                {pendingIncoming.length} Action Needed
              </span>
            )}
          </div>
          <Link to="/exchanges" className="panel-link">All Exchanges <FiArrowRight /></Link>
        </div>

        {pendingIncoming.length === 0 && pendingOutgoing.length === 0 && (
          <p style={{ color: "var(--gray)", fontSize: 14, margin: "6px 0 0" }}>
            No pending exchange requests at this time. Browse Discover to propose a new skill swap.
          </p>
        )}

        {/* Incoming Proposals needing response */}
        {pendingIncoming.map((ex) => (
          <div className="ex-row" key={ex.id || ex._id}>
            <img className="ex-avatar" src={ex.partnerPhoto} alt={ex.partnerName} />
            <div className="ex-info">
              <div className="ex-name">{ex.teach} ↔ {ex.want}</div>
              <div className="ex-swap">
                Proposal from <b>{ex.partnerName}</b> ({ex.partnerLocation || "Online"})
              </div>
              <div className="ex-meta">
                <span className="status-pill st-pending">Incoming Proposal</span>
                <span>{ex.mode || "Online"} · {ex.totalSessions || 4} Sessions</span>
              </div>
            </div>
            <div className="ex-actions">
              <button
                className="btn-xs dark"
                disabled={actionLoadingId === (ex.id || ex._id)}
                onClick={() => handleAcceptRequest(ex.id || ex._id, ex.partnerName)}
              >
                Accept
              </button>
              <button
                className="btn-xs"
                disabled={actionLoadingId === (ex.id || ex._id)}
                onClick={() => handleRejectRequest(ex.id || ex._id, ex.partnerName)}
              >
                Decline
              </button>
              <button className="btn-xs" onClick={() => navigate(`/exchanges/${ex.id || ex._id}`)}>
                Review
              </button>
            </div>
          </div>
        ))}

        {/* Outgoing Proposals awaiting partner response */}
        {pendingOutgoing.length > 0 && (
          <div style={{ marginTop: pendingIncoming.length > 0 ? 16 : 0, borderTop: pendingIncoming.length > 0 ? "1px solid var(--border)" : "none", paddingTop: pendingIncoming.length > 0 ? 14 : 0 }}>
            {pendingIncoming.length > 0 && (
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gray)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Sent Proposals (Awaiting Partner)
              </div>
            )}
            {pendingOutgoing.map((ex) => (
              <div className="ex-row" key={ex.id || ex._id} style={{ opacity: 0.9 }}>
                <img className="ex-avatar" src={ex.partnerPhoto} alt={ex.partnerName} />
                <div className="ex-info">
                  <div className="ex-name">{ex.teach} ↔ {ex.want}</div>
                  <div className="ex-swap">
                    Sent to <b>{ex.partnerName}</b> · Awaiting response
                  </div>
                  <div className="ex-meta">
                    <span className="status-pill st-active" style={{ background: "rgba(17,17,17,0.06)" }}>Sent Proposal</span>
                    <span>{ex.mode || "Online"}</span>
                  </div>
                </div>
                <div className="ex-actions">
                  <button className="btn-xs" onClick={() => navigate(`/exchanges/${ex.id || ex._id}`)}>
                    View Proposal
                  </button>
                  <button
                    className="btn-xs danger"
                    disabled={actionLoadingId === (ex.id || ex._id)}
                    onClick={() => handleCancelRequest(ex.id || ex._id, ex.partnerName)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Continue Learning (Active Exchanges) */}
      <div className="dash-panel">
        <div className="panel-title">
          <h3>Continue Learning</h3>
          <Link to="/exchanges" className="panel-link">All Exchanges <FiArrowRight /></Link>
        </div>
        {active.length === 0 && (
          <p style={{ color: "var(--gray)", fontSize: 14 }}>
            No active exchanges in progress yet — connect with a learning partner from Discover to begin.
          </p>
        )}
        {active.map((ex) => (
          <div className="ex-row" key={ex.id || ex._id}>
            <img className="ex-avatar" src={ex.partnerPhoto} alt={ex.partnerName} />
            <div className="ex-info">
              <div className="ex-name">{ex.teach} ↔ {ex.want}</div>
              <div className="ex-swap">Partner: <b>{ex.partnerName}</b></div>
              <div className="progress"><i style={{ width: `${ex.progress || 0}%` }} /></div>
            </div>
            <span className="status-pill st-active">{ex.progress || 0}%</span>
            <Link to={`/exchanges/${ex.id || ex._id}`} className="btn-xs dark">Open</Link>
          </div>
        ))}
      </div>

      {/* 6. Upcoming Sessions */}
      <div className="dash-panel">
        <div className="panel-title">
          <h3>Upcoming Sessions</h3>
          <Link to="/sessions" className="panel-link">Schedule Session <FiArrowRight /></Link>
        </div>
        {upcoming.length === 0 && (
          <p style={{ color: "var(--gray)", fontSize: 14 }}>
            No upcoming sessions scheduled yet — coordinate a time with your exchange partner anytime.
          </p>
        )}
        {upcoming.map((s) => (
          <div className="ex-row" key={s.id || s._id}>
            <img className="ex-avatar" src={s.photo} alt={s.partner} />
            <div className="ex-info">
              <div className="ex-name">{s.skill} with {s.partner}</div>
              <div className="ex-meta">
                <span className="date-chip"><FiCalendar /> {s.date}</span>
                <span className="date-chip">{s.time}</span>
                <span className="date-chip">{s.mode || "Online"}</span>
                <span className="status-pill st-pending" style={{ fontSize: 11, padding: "2px 8px" }}>Scheduled</span>
              </div>
            </div>
            <button className="btn-xs" onClick={() => navigate("/sessions")}>
              Details
            </button>
          </div>
        ))}
      </div>

      {/* 4. My Skills Section */}
      <div className="dash-panel">
        <div className="panel-title">
          <h3>My Skills Overview</h3>
          <Link to="/my-profile" className="panel-link">Manage Skills <FiArrowRight /></Link>
        </div>
        <div className="skills-deck">
          <div className="skills-column">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800, fontSize: 14.5, display: "flex", alignItems: "center", gap: 7 }}>
                <FiArrowUpRight style={{ color: "#7A5C00" }} /> Skills I Teach ({teachesSkills.length})
              </div>
              <Link to="/my-profile" style={{ fontSize: 12, fontWeight: 700, textDecoration: "underline" }}>
                Edit
              </Link>
            </div>
            {teachesSkills.length === 0 ? (
              <p style={{ color: "var(--gray)", fontSize: 13, marginTop: 10 }}>
                No teaching skills listed yet. Add skills you can share with peers in your profile.
              </p>
            ) : (
              <div className="skills-tag-wrap">
                {teachesSkills.map((sk, idx) => (
                  <span className="skill-chip-tag teach" key={idx}>
                    <FiCheck style={{ fontSize: 12 }} /> {sk}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="skills-column">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800, fontSize: 14.5, display: "flex", alignItems: "center", gap: 7 }}>
                <FiArrowDownLeft style={{ color: "#1D4ED8" }} /> Skills I Want to Learn ({wantsSkills.length})
              </div>
              <Link to="/my-profile" style={{ fontSize: 12, fontWeight: 700, textDecoration: "underline" }}>
                Edit
              </Link>
            </div>
            {wantsSkills.length === 0 ? (
              <p style={{ color: "var(--gray)", fontSize: 13, marginTop: 10 }}>
                No learning goals added yet. Add skills you want to learn to find partner matches.
              </p>
            ) : (
              <div className="skills-tag-wrap">
                {wantsSkills.map((sk, idx) => (
                  <span className="skill-chip-tag want" key={idx}>
                    <FiSearch style={{ fontSize: 12 }} /> {sk}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Recent Activity */}
      <div className="dash-panel">
        <div className="panel-title">
          <h3>Recent Activity</h3>
          <Link to="/notifications" className="panel-link">All Notifications <FiArrowRight /></Link>
        </div>
        {notifications.length === 0 ? (
          <p style={{ color: "var(--gray)", fontSize: 14 }}>
            No recent activity recorded yet. Connect with members, propose swaps, or schedule sessions to see live updates.
          </p>
        ) : (
          <div className="activity-feed">
            {notifications.slice(0, 5).map((n) => {
              const isReq = n.type === "request" || (n.title && n.title.toLowerCase().includes("exchange"));
              const isSession = n.type === "session" || (n.title && n.title.toLowerCase().includes("session"));
              const isMsg = n.type === "message";

              return (
                <div className="activity-row" key={n.id || n._id}>
                  <div className="activity-icon-wrap">
                    {isReq ? <FiRepeat /> : isSession ? <FiCalendar /> : isMsg ? <FiMessageSquare /> : <FiActivity />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{n.title}</div>
                      <span style={{ fontSize: 12, color: "var(--gray)", whiteSpace: "nowrap" }}>{n.time || "Recently"}</span>
                    </div>
                    <div style={{ color: "var(--gray)", fontSize: 13, marginTop: 3, lineHeight: 1.45 }}>
                      {n.text}
                    </div>
                  </div>
                  {n.link && (
                    <button className="btn-xs" style={{ alignSelf: "center", marginLeft: 8 }} onClick={() => navigate(n.link)}>
                      Open
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recommended People Section */}
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
            <div className="ex-row" key={u.id || u._id}>
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
              {sentIds.includes(u.id || u._id) ? (
                <span className="btn-xs" style={{ background: "var(--yellow)", borderColor: "var(--yellow)" }}>
                  <FiCheck /> Request Sent
                </span>
              ) : (
                <button
                  className="btn-xs dark"
                  onClick={() => connect(u)}
                  disabled={connectingId === (u.id || u._id)}
                >
                  {connectingId === (u.id || u._id) ? "Connecting..." : "Connect"}
                </button>
              )}
              <button className="btn-xs" onClick={() => navigate(`/profile/${u.id || u._id}`)}>View</button>
            </div>
          );
        })}
      </div>

      {/* Feedback Toast */}
      {toastMsg && (
        <div className="toast">
          <i />
          <span>{toastMsg}</span>
        </div>
      )}
    </>
  );
}
