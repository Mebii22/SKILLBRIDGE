import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { FiRepeat, FiCalendar, FiCheckCircle, FiStar, FiAward, FiArrowRight } from "react-icons/fi";
import ExchangeCard from "../../components/ExchangeCard";
import EmptyState from "../../components/EmptyState";
import SkillTag from "../../components/SkillTag";
import { fetchExchangesAsync } from "../../redux/slices/exchangeSlice";
import { fetchSessionsAsync } from "../../redux/slices/sessionSlice";

const TABS = [
  { key: "pending", label: "Requests" },
  { key: "active", label: "In Progress" },
  { key: "completed", label: "Completed & Skill Journey" },
];

export default function Exchanges() {
  const [tab, setTab] = useState("active");
  const dispatch = useDispatch();
  const exchanges = useSelector((s) => s.exchanges.exchanges);
  const sessions = useSelector((s) => s.sessions.sessions);
  const currentUser = useSelector((s) => s.user.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchExchangesAsync());
    dispatch(fetchSessionsAsync());
  }, [dispatch]);

  const activeCount = exchanges.filter((e) => e.status === "active").length;
  const completedCount = exchanges.filter((e) => e.status === "completed").length;
  const pendingCount = exchanges.filter((e) => e.status === "pending").length;
  const upcomingSessionsCount = (sessions || []).filter((s) => s.status === "upcoming").length;

  const stats = [
    { label: "Active Exchanges", value: activeCount, icon: <FiRepeat /> },
    { label: "Upcoming Sessions", value: upcomingSessionsCount, icon: <FiCalendar /> },
    { label: "Completed Exchanges", value: completedCount, icon: <FiCheckCircle /> },
    { label: "Community Rating", value: `${currentUser?.rating || 4.9} ★`, icon: <FiStar /> },
  ];

  const list = exchanges.filter((e) => e.status === tab);

  return (
    <>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1>My Exchanges</h1>
          <p>Track your skill swaps — from request agreement to completed milestones.</p>
        </div>
        <Link to="/discover" className="btn btn-dark btn-sm">
          Discover New Skills
        </Link>
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

      {/* Tabs */}
      <div className="tabs">
        {TABS.map((t) => {
          const count = exchanges.filter((e) => e.status === t.key).length;
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

      {/* Completed Tab: My Skill Journey Showcase */}
      {tab === "completed" && list.length > 0 && (
        <div className="dash-panel" style={{ background: "linear-gradient(180deg, #fffdf5 0%, var(--surface) 100%)", border: "2px solid #F7C843", marginBottom: 24 }}>
          <div className="panel-title" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#F7C843", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                <FiAward />
              </div>
              <div>
                <h3 style={{ margin: 0 }}>My Skill Journey</h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--gray)" }}>
                  Verified peer-to-peer achievements and mutual endorsements
                </p>
              </div>
            </div>
            <span className="status-pill st-completed">{completedCount} Exchanged</span>
          </div>

          <div className="journey-grid">
            {list.map((ex) => (
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
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <img
                      src={ex.partnerPhoto}
                      alt={ex.partnerName}
                      style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{ex.partnerName}</div>
                      <div style={{ fontSize: 12.5, color: "var(--gray)" }}>
                        Completed {ex.agreement?.acceptedAt || "recently"}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "var(--cream)", padding: "10px 14px", borderRadius: 12, marginBottom: 12, fontSize: 13.5 }}>
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ color: "var(--gray)", fontSize: 12 }}>You Learned: </span>
                      <SkillTag>{ex.want}</SkillTag>
                    </div>
                    <div>
                      <span style={{ color: "var(--gray)", fontSize: 12 }}>You Taught: </span>
                      <SkillTag yellow>{ex.teach}</SkillTag>
                    </div>
                  </div>

                  {ex.review && (
                    <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--ink)", margin: "8px 0" }}>
                      “{ex.review}”
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                  <span className="stars">
                    {[...Array(ex.rating || 5)].map((_, i) => (
                      <FiStar key={i} fill="#F7C843" stroke="#111" />
                    ))}
                  </span>
                  <Link to={`/exchanges/${ex._id || ex.id}`} className="link" style={{ fontSize: 13, fontWeight: 600 }}>
                    View Agreement <FiArrowRight />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main List Panel */}
      <div className="dash-panel">
        {list.length === 0 ? (
          <EmptyState
            doodle="skill-exchange"
            title={tab === "pending" ? "No pending requests" : tab === "active" ? "No active exchanges right now" : "No completed exchanges yet"}
            text="Every great skill journey starts with a simple exchange connection."
            actionLabel="Discover Learning Partners"
            onAction={() => navigate("/discover")}
          />
        ) : (
          list.map((ex) => <ExchangeCard key={ex._id || ex.id} ex={ex} />)
        )}
      </div>
    </>
  );
}