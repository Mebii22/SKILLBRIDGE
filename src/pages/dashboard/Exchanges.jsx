import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import {
  FiRepeat,
  FiCalendar,
  FiCheckCircle,
  FiStar,
  FiAward,
  FiArrowRight,
  FiCheck,
  FiX,
  FiMapPin,
  FiClock,
  FiUser,
  FiFileText,
  FiMessageSquare,
  FiRefreshCw
} from "react-icons/fi";
import ExchangeCard from "../../components/ExchangeCard";
import EmptyState from "../../components/EmptyState";
import SkillTag from "../../components/SkillTag";
import {
  fetchExchangesAsync,
  acceptExchangeAsync,
  rejectExchangeAsync,
  cancelExchangeAsync
} from "../../redux/slices/exchangeSlice";
import { fetchSessionsAsync } from "../../redux/slices/sessionSlice";

const TABS = [
  { key: "incoming", label: "Incoming Requests" },
  { key: "sent", label: "Sent Requests" },
  { key: "active", label: "In Progress" },
  { key: "completed", label: "Completed & Skill Journey" },
];

export default function Exchanges() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const exchanges = useSelector((s) => s.exchanges.exchanges || []);
  const sessions = useSelector((s) => s.sessions.sessions || []);
  const currentUser = useSelector((s) => s.user.currentUser);
  const loading = useSelector((s) => s.exchanges.loading);

  const [tab, setTab] = useState("incoming");
  const [toastMsg, setToastMsg] = useState("");
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    dispatch(fetchExchangesAsync());
    dispatch(fetchSessionsAsync());
  }, [dispatch]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const incomingRequests = exchanges.filter(
    (e) => e.status === "pending" && !e.isRequester
  );
  const sentRequests = exchanges.filter(
    (e) => e.status === "pending" && e.isRequester
  );
  const activeExchanges = exchanges.filter(
    (e) => e.status === "active" || e.status === "accepted"
  );
  const completedExchanges = exchanges.filter(
    (e) => e.status === "completed"
  );
  const upcomingSessionsCount = (sessions || []).filter(
    (s) => s.status === "upcoming"
  ).length;

  const stats = [
    { label: "Incoming Pending", value: incomingRequests.length, icon: <FiClock /> },
    { label: "Active Swaps", value: activeExchanges.length, icon: <FiRepeat /> },
    { label: "Upcoming Sessions", value: upcomingSessionsCount, icon: <FiCalendar /> },
    { label: "Completed", value: completedExchanges.length, icon: <FiCheckCircle /> },
  ];

  const handleAccept = async (ex) => {
    const id = ex.id || ex._id;
    try {
      setActionId(id);
      await dispatch(acceptExchangeAsync(id)).unwrap();
      showToast(`Accepted exchange proposal with ${ex.partnerName}! You are now learning partners.`);
    } catch (err) {
      showToast(typeof err === "string" ? err : "Failed to accept exchange.");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (ex) => {
    const id = ex.id || ex._id;
    try {
      setActionId(id);
      await dispatch(rejectExchangeAsync(id)).unwrap();
      showToast(`Declined exchange proposal from ${ex.partnerName}.`);
    } catch (err) {
      showToast(typeof err === "string" ? err : "Failed to reject exchange.");
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (ex) => {
    const id = ex.id || ex._id;
    try {
      setActionId(id);
      await dispatch(cancelExchangeAsync(id)).unwrap();
      showToast(`Cancelled pending exchange request to ${ex.partnerName}.`);
    } catch (err) {
      showToast(typeof err === "string" ? err : "Failed to cancel request.");
    } finally {
      setActionId(null);
    }
  };

  const getAvatar = (photo, name) =>
    photo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name || "Learner"
    )}&background=F5C518&color=111111&bold=true`;

  return (
    <>
      <div
        className="page-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <h1>My Exchanges</h1>
          <p>
            Track and manage your peer-to-peer skill swap proposals and ongoing learning agreements.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => dispatch(fetchExchangesAsync())}
            title="Refresh exchanges"
          >
            <FiRefreshCw className={loading ? "spin" : ""} /> Refresh
          </button>
          <Link to="/discover" className="btn btn-dark btn-sm">
            Discover New Skills
          </Link>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
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

      {/* Navigation Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map((t) => {
          let count = 0;
          if (t.key === "incoming") count = incomingRequests.length;
          else if (t.key === "sent") count = sentRequests.length;
          else if (t.key === "active") count = activeExchanges.length;
          else if (t.key === "completed") count = completedExchanges.length;

          return (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* TAB A: INCOMING REQUESTS (Received Proposals Needing Response) */}
      {/* =================================================================== */}
      {tab === "incoming" && (
        <div className="dash-panel">
          <div className="panel-title" style={{ marginBottom: 16 }}>
            <h3>Incoming Exchange Proposals</h3>
            <span style={{ fontSize: 13, color: "var(--gray)" }}>
              {incomingRequests.length === 1
                ? "1 peer awaiting your response"
                : `${incomingRequests.length} peers awaiting your response`}
            </span>
          </div>

          {incomingRequests.length === 0 ? (
            <EmptyState
              doodle="skill-exchange"
              title="No incoming exchange requests"
              text="When other members find your skills on Discover and propose a skill swap, their proposals will appear here."
              actionLabel="Explore People on Discover"
              onAction={() => navigate("/discover")}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {incomingRequests.map((ex) => {
                const senderName = ex.sender?.name || ex.partnerName || "Learner";
                const senderPhoto = getAvatar(ex.sender?.photo || ex.partnerPhoto, senderName);
                const senderLoc = ex.sender?.location || ex.sender?.city || ex.partnerLocation || "Everywhere";
                const senderId = ex.sender?.id || ex.requester?._id || ex.requester;
                const exId = ex.id || ex._id;
                const isWorking = actionId === exId;

                return (
                  <div
                    key={exId}
                    style={{
                      background: "var(--surface)",
                      border: "1.5px solid var(--border)",
                      borderRadius: 18,
                      padding: "20px 22px",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 12,
                        marginBottom: 14,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <img
                          src={senderPhoto}
                          alt={senderName}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getAvatar(null, senderName);
                          }}
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #fff",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>
                            {senderName}
                          </div>
                          <div
                            style={{
                              fontSize: 12.5,
                              color: "var(--gray)",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 2,
                            }}
                          >
                            <span>
                              <FiMapPin /> {senderLoc}
                            </span>
                            <span>•</span>
                            <span
                              style={{
                                padding: "1px 7px",
                                borderRadius: 10,
                                background: "var(--cream)",
                                border: "1px solid var(--border)",
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {ex.mode === "Offline" ? "📍 Offline" : "🌐 Online"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="status-pill st-pending">Action Needed</span>
                      </div>
                    </div>

                    {/* Swap details box */}
                    <div
                      style={{
                        background: "var(--cream)",
                        border: "1px solid rgba(216, 211, 200, 0.7)",
                        borderRadius: 14,
                        padding: "14px 18px",
                        marginBottom: 14,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <div style={{ fontSize: 13.5 }}>
                          <span style={{ color: "var(--gray)", fontSize: 12, fontWeight: 700 }}>
                            THEY WILL TEACH:
                          </span>{" "}
                          <SkillTag yellow>{ex.teach}</SkillTag>
                        </div>
                        <div style={{ fontSize: 13.5 }}>
                          <span style={{ color: "var(--gray)", fontSize: 12, fontWeight: 700 }}>
                            YOU WILL TEACH:
                          </span>{" "}
                          <SkillTag>{ex.want}</SkillTag>
                        </div>
                      </div>

                      {ex.message ? (
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--ink)",
                            fontStyle: "italic",
                            borderLeft: "3px solid var(--yellow)",
                            paddingLeft: 10,
                            marginTop: 4,
                            lineHeight: 1.45,
                            wordBreak: "break-word",
                          }}
                        >
                          &ldquo;{ex.message}&rdquo;
                        </div>
                      ) : null}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          fontSize: 12,
                          color: "var(--gray)",
                          flexWrap: "wrap",
                          borderTop: "1px dashed rgba(216, 211, 200, 0.7)",
                          paddingTop: 8,
                          marginTop: 4,
                        }}
                      >
                        <span>
                          <FiClock /> {ex.totalSessions || 4} planned sessions ({ex.duration || "1 Hour"} each)
                        </span>
                        {ex.preferredDate && (
                          <span>
                            <FiCalendar /> Requested start: {ex.preferredDate} {ex.preferredTime && `at ${ex.preferredTime}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <Link
                        to={`/profile/${senderId}`}
                        className="btn btn-outline btn-xs"
                        style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                      >
                        <FiUser /> View Profile
                      </Link>
                      <Link
                        to={`/exchanges/${exId}`}
                        className="btn btn-outline btn-xs"
                        style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                      >
                        <FiFileText /> Agreement Details
                      </Link>
                      <button
                        type="button"
                        className="btn-xs danger"
                        disabled={isWorking}
                        onClick={() => handleReject(ex)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", fontWeight: 700 }}
                      >
                        <FiX /> Reject
                      </button>
                      <button
                        type="button"
                        className="btn btn-dark btn-xs"
                        disabled={isWorking}
                        onClick={() => handleAccept(ex)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", fontWeight: 700 }}
                      >
                        <FiCheck /> Accept Swap
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB B: SENT REQUESTS (Proposals Sent by Logged-in User) */}
      {/* =================================================================== */}
      {tab === "sent" && (
        <div className="dash-panel">
          <div className="panel-title" style={{ marginBottom: 16 }}>
            <h3>Sent Exchange Proposals</h3>
            <span style={{ fontSize: 13, color: "var(--gray)" }}>
              {sentRequests.length === 1
                ? "1 proposal awaiting partner acceptance"
                : `${sentRequests.length} proposals awaiting partner acceptance`}
            </span>
          </div>

          {sentRequests.length === 0 ? (
            <EmptyState
              doodle="search"
              title="No sent exchange requests"
              text="You haven’t proposed any skill swaps yet. Browse Discover to find peers and click Start Swap to connect."
              actionLabel="Explore Discover"
              onAction={() => navigate("/discover")}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {sentRequests.map((ex) => {
                const recipientName = ex.recipient?.name || ex.partnerName || "Partner";
                const recipientPhoto = getAvatar(ex.recipient?.photo || ex.partnerPhoto, recipientName);
                const recipientLoc = ex.recipient?.location || ex.recipient?.city || ex.partnerLocation || "Everywhere";
                const recipientId = ex.recipient?.id || ex.partner?._id || ex.partner;
                const exId = ex.id || ex._id;
                const isWorking = actionId === exId;

                return (
                  <div
                    key={exId}
                    style={{
                      background: "var(--surface)",
                      border: "1.5px solid var(--border)",
                      borderRadius: 18,
                      padding: "20px 22px",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 12,
                        marginBottom: 14,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <img
                          src={recipientPhoto}
                          alt={recipientName}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getAvatar(null, recipientName);
                          }}
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #fff",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>
                            {recipientName}
                          </div>
                          <div
                            style={{
                              fontSize: 12.5,
                              color: "var(--gray)",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 2,
                            }}
                          >
                            <span>
                              <FiMapPin /> {recipientLoc}
                            </span>
                            <span>•</span>
                            <span
                              style={{
                                padding: "1px 7px",
                                borderRadius: 10,
                                background: "var(--cream)",
                                border: "1px solid var(--border)",
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {ex.mode === "Offline" ? "📍 Offline" : "🌐 Online"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="status-pill st-active" style={{ background: "rgba(17,17,17,0.06)", color: "var(--ink)" }}>
                          Awaiting Partner
                        </span>
                      </div>
                    </div>

                    {/* Swap details box */}
                    <div
                      style={{
                        background: "var(--cream)",
                        border: "1px solid rgba(216, 211, 200, 0.7)",
                        borderRadius: 14,
                        padding: "14px 18px",
                        marginBottom: 14,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <div style={{ fontSize: 13.5 }}>
                          <span style={{ color: "var(--gray)", fontSize: 12, fontWeight: 700 }}>
                            YOU OFFERED TO TEACH:
                          </span>{" "}
                          <SkillTag yellow>{ex.teach}</SkillTag>
                        </div>
                        <div style={{ fontSize: 13.5 }}>
                          <span style={{ color: "var(--gray)", fontSize: 12, fontWeight: 700 }}>
                            YOU REQUESTED TO LEARN:
                          </span>{" "}
                          <SkillTag>{ex.want}</SkillTag>
                        </div>
                      </div>

                      {ex.message ? (
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--ink)",
                            fontStyle: "italic",
                            borderLeft: "3px solid var(--yellow)",
                            paddingLeft: 10,
                            marginTop: 4,
                            lineHeight: 1.45,
                            wordBreak: "break-word",
                          }}
                        >
                          &ldquo;{ex.message}&rdquo;
                        </div>
                      ) : null}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          fontSize: 12,
                          color: "var(--gray)",
                          flexWrap: "wrap",
                          borderTop: "1px dashed rgba(216, 211, 200, 0.7)",
                          paddingTop: 8,
                          marginTop: 4,
                        }}
                      >
                        <span>
                          <FiClock /> {ex.totalSessions || 4} sessions ({ex.duration || "1 Hour"} each)
                        </span>
                        {ex.preferredDate && (
                          <span>
                            <FiCalendar /> Proposed date: {ex.preferredDate} {ex.preferredTime && `at ${ex.preferredTime}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <Link
                        to={`/profile/${recipientId}`}
                        className="btn btn-outline btn-xs"
                        style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                      >
                        <FiUser /> Partner Profile
                      </Link>
                      <Link
                        to={`/exchanges/${exId}`}
                        className="btn btn-outline btn-xs"
                        style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                      >
                        <FiFileText /> View Agreement
                      </Link>
                      <button
                        type="button"
                        className="btn-xs danger"
                        disabled={isWorking}
                        onClick={() => handleCancel(ex)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", fontWeight: 700 }}
                      >
                        <FiX /> Cancel Request
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB C: IN PROGRESS EXCHANGES */}
      {/* =================================================================== */}
      {tab === "active" && (
        <div className="dash-panel">
          <div className="panel-title" style={{ marginBottom: 16 }}>
            <h3>In Progress Skill Exchanges</h3>
            <span style={{ fontSize: 13, color: "var(--gray)" }}>
              {activeExchanges.length === 1
                ? "1 active exchange in progress"
                : `${activeExchanges.length} active exchanges in progress`}
            </span>
          </div>

          {activeExchanges.length === 0 ? (
            <EmptyState
              doodle="skill-exchange"
              title="No active exchanges right now"
              text="When you accept an incoming proposal or a partner accepts yours, it becomes an active exchange ready for learning sessions."
              actionLabel="View Incoming Requests"
              onAction={() => setTab("incoming")}
            />
          ) : (
            activeExchanges.map((ex) => <ExchangeCard key={ex._id || ex.id} ex={ex} />)
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB D: COMPLETED & SKILL JOURNEY */}
      {/* =================================================================== */}
      {tab === "completed" && (
        <>
          {completedExchanges.length > 0 && (
            <div
              className="dash-panel"
              style={{
                background: "linear-gradient(180deg, #fffdf5 0%, var(--surface) 100%)",
                border: "2px solid #F7C843",
                marginBottom: 24,
              }}
            >
              <div
                className="panel-title"
                style={{
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "#F7C843",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                    }}
                  >
                    <FiAward />
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>My Skill Journey</h3>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--gray)" }}>
                      Verified peer-to-peer achievements and mutual endorsements
                    </p>
                  </div>
                </div>
                <span className="status-pill st-completed">
                  {completedExchanges.length} Exchanged
                </span>
              </div>

              <div className="journey-grid">
                {completedExchanges.map((ex) => (
                  <div
                    key={ex._id || ex.id}
                    style={{
                      background: "var(--surface)",
                      borderRadius: 16,
                      padding: "18px 20px",
                      border: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        <img
                          src={getAvatar(ex.partnerPhoto, ex.partnerName)}
                          alt={ex.partnerName}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getAvatar(null, ex.partnerName);
                          }}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>
                            {ex.partnerName}
                          </div>
                          <div style={{ fontSize: 12.5, color: "var(--gray)" }}>
                            Completed {ex.agreement?.acceptedAt || "recently"}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          background: "var(--cream)",
                          padding: "10px 14px",
                          borderRadius: 12,
                          marginBottom: 12,
                          fontSize: 13.5,
                        }}
                      >
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ color: "var(--gray)", fontSize: 12 }}>
                            You Learned:{" "}
                          </span>
                          <SkillTag>{ex.want}</SkillTag>
                        </div>
                        <div>
                          <span style={{ color: "var(--gray)", fontSize: 12 }}>
                            You Taught:{" "}
                          </span>
                          <SkillTag yellow>{ex.teach}</SkillTag>
                        </div>
                      </div>

                      {ex.review && (
                        <p
                          style={{
                            fontSize: 13,
                            fontStyle: "italic",
                            color: "var(--ink)",
                            margin: "8px 0",
                            wordBreak: "break-word",
                          }}
                        >
                          &ldquo;{ex.review}&rdquo;
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 12,
                        borderTop: "1px solid var(--border)",
                        paddingTop: 10,
                      }}
                    >
                      {ex.rating ? (
                        <span className="stars">
                          {[...Array(ex.rating)].map((_, i) => (
                            <FiStar key={i} fill="#F7C843" stroke="#111" />
                          ))}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12.5, color: "var(--gray)", fontWeight: 600 }}>
                          Review Pending
                        </span>
                      )}
                      <Link
                        to={`/exchanges/${ex._id || ex.id}`}
                        className="link"
                        style={{ fontSize: 13, fontWeight: 600 }}
                      >
                        {ex.hasReviewed || ex.myReview ? "View Agreement" : "Rate & Review"} <FiArrowRight />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dash-panel">
            {completedExchanges.length === 0 ? (
              <EmptyState
                doodle="skill-exchange"
                title="No completed exchanges yet"
                text="Complete learning sessions with your partners to finalize your exchanges and earn verified peer endorsements."
                actionLabel="Discover Skills"
                onAction={() => navigate("/discover")}
              />
            ) : (
              completedExchanges.map((ex) => (
                <ExchangeCard key={ex._id || ex.id} ex={ex} />
              ))
            )}
          </div>
        </>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="toast">
          <i /> {toastMsg}
        </div>
      )}
    </>
  );
}
