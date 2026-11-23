import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiList,
  FiRepeat,
  FiClock,
  FiCheckCircle,
  FiCalendar,
  FiArrowRight,
  FiActivity
} from "react-icons/fi";
import { fetchAdminStatsAsync } from "../../redux/slices/adminSlice";

// Helper to format activity timeline item with structured actor attribution
const formatActivityTitle = (a) => {
  if (!a) return "System activity";
  const actor = a.adminName || (a.admin && (a.admin.fullName || a.admin.name)) || "SKILLBRIDGE Admin";

  if (a.text) {
    // Standardize admin actor attribution while preserving target entities, users named jeny, and reasons
    return a.text.replace(/\bby (?:jeny|Platform Administrator)\b(?=(\. Reason:|\.|$))/g, `by ${actor}`);
  }

  if (a.action && a.targetName) {
    switch (a.action) {
      case "USER_DISABLED":
        return `User '${a.targetName}' was disabled by ${actor}`;
      case "USER_ACTIVATED":
        return `User '${a.targetName}' was reactivated by ${actor}`;
      case "USER_DELETED":
        return `User account '${a.targetName}' was permanently removed by ${actor}${a.reason ? `. Reason: ${a.reason}` : ""}`;
      case "SKILL_REMOVED":
        return `Skill '${a.targetName}' was removed by ${actor}${a.reason ? `. Reason: ${a.reason}` : ""}`;
      case "SKILL_RESTORED":
        return `Skill '${a.targetName}' was restored by ${actor}`;
      case "REPORT_RESOLVED":
        return `Report on '${a.targetName}' was resolved by ${actor}`;
      default:
        break;
    }
  }

  return `${a.action || "Activity"}: ${a.targetName || "System"}`;
};

// Safe date formatter matching SKILLBRIDGE format (MMM D, YYYY)
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return "N/A";
  }
};

// Semantic status badge metadata helpers
const getStatusLabel = (status) => {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "active":
      return "Active";
    case "pending":
      return "Pending";
    case "completed":
      return "Completed";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
  }
};

const getStatusClass = (status) => {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "active":
      return "st-active";
    case "pending":
      return "st-pending";
    case "completed":
      return "st-completed";
    case "rejected":
    case "cancelled":
      return "st-cancelled";
    default:
      return `st-${s}`;
  }
};

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const adminState = useSelector((s) => s.admin);
  const { stats, platformExchanges, activities, loading, error } = adminState;
  const recentUsers = adminState.recentUsers || [];

  useEffect(() => {
    dispatch(fetchAdminStatsAsync());
  }, [dispatch]);

  const statItems = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: <FiUsers />, color: "#4f46e5" },
    { label: "Active Users", value: stats?.activeUsers ?? 0, icon: <FiUserCheck />, color: "#16a34a" },
    { label: "Disabled Users", value: stats?.disabledUsers ?? 0, icon: <FiUserX />, color: "#dc2626" },
    { label: "Total Skills", value: stats?.totalSkills ?? 0, icon: <FiList />, color: "#d97706" },
    { label: "Total Exchanges", value: stats?.totalExchanges ?? 0, icon: <FiRepeat />, color: "#2563eb" },
    { label: "Pending Exchanges", value: stats?.pendingExchanges ?? 0, icon: <FiClock />, color: "#eab308" },
    { label: "Completed Exchanges", value: stats?.completedExchanges ?? 0, icon: <FiCheckCircle />, color: "#059669" },
    { label: "Total Sessions", value: stats?.totalSessions ?? 0, icon: <FiCalendar />, color: "#9333ea" },
  ];

  return (
    <>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1>Platform Overview</h1>
          <p>Real-time database statistics and activity monitoring for SkillBridge.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-xs"
          onClick={() => dispatch(fetchAdminStatsAsync())}
          title="Refresh metrics"
        >
          ↻ Refresh Metrics
        </button>
      </div>

      {error && (
        <div className="dash-panel" style={{ borderLeft: "4px solid #dc2626", background: "#fef2f2", marginBottom: 20 }}>
          <p style={{ color: "#991b1b", margin: 0, fontSize: 14 }}>
            <b>Error loading metrics:</b> {error}
          </p>
        </div>
      )}

      {/* 8 Statistic Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {statItems.map((s) => (
          <div className="stat-card" key={s.label} style={{ background: "var(--surface)" }}>
            <div className="stat-top">
              <span className="stat-label">{s.label}</span>
              <span className="stat-icon" style={{ color: s.color, background: "rgba(0,0,0,0.04)" }}>
                {s.icon}
              </span>
            </div>
            <div className="stat-value">{loading ? "..." : s.value}</div>
          </div>
        ))}
      </div>

      {/* Platform Exchanges & Agreements Table */}
      <div className="dash-panel">
        <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3>Recent Platform Exchanges</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--gray)" }}>
              Structured learning agreements and active peer swaps
            </p>
          </div>
          <Link to="/admin/exchanges" className="panel-link">
            View All ({stats?.totalExchanges ?? platformExchanges.length}) <FiArrowRight />
          </Link>
        </div>

        {platformExchanges.length === 0 ? (
          <p style={{ color: "var(--gray)", fontSize: 14, margin: "16px 0 0" }}>No exchanges recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Participants</th>
                  <th>Skill Swap</th>
                  <th>Mode</th>
                  <th>Created Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {platformExchanges.slice(0, 5).map((e) => (
                  <tr key={e._id || e.id}>
                    <td>
                      <div className="t-user">
                        <span><b>{e.requesterName}</b> ↔ <b>{e.partnerName}</b></span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{e.teach}</span> ↔ <span>{e.want}</span>
                    </td>
                    <td>
                      <span className="date-chip" style={{ fontSize: 12 }}>
                        {e.mode === "Offline" ? "📍 Offline" : "🌐 Online"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: "var(--text-sec)", whiteSpace: "nowrap" }}>
                        {formatDate(e.createdAt)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${getStatusClass(e.status)}`}>
                        {getStatusLabel(e.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="admin-grid">
        {/* Recent Admin Activity */}
        <div className="dash-panel">
          <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Recent Activity</h3>
            <Link to="/admin/activity" className="panel-link">
              View History <FiArrowRight />
            </Link>
          </div>

          {activities.length === 0 ? (
            <p style={{ color: "var(--gray)", fontSize: 13.5 }}>No recent administrative actions recorded.</p>
          ) : (
            <div className="timeline">
              {activities.slice(0, 5).map((a, i) => (
                <div className="tl-item done" key={a._id || i}>
                  <span className="tl-dot" />
                  <div className="tl-title" style={{ fontWeight: 600, fontSize: 13.5 }}>
                    {formatActivityTitle(a)}
                  </div>
                  <div className="tl-sub">
                    {a.createdAt ? new Date(a.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : a.time || "Recently"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links & Shortcuts */}
        <div className="dash-panel">
          <div className="panel-title">
            <h3>Administrative Quick Links</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Link
              to="/admin/users"
              className="ex-row"
              style={{ textDecoration: "none", color: "inherit", padding: 14 }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4338ca", fontSize: 18 }}>
                <FiUsers />
              </div>
              <div className="ex-info">
                <div className="ex-name" style={{ fontSize: 15 }}>Manage Users & Accounts</div>
                <div className="ex-swap">View all accounts, search by name/email, disable or delete</div>
              </div>
              <FiArrowRight style={{ color: "var(--gray)" }} />
            </Link>

            <Link
              to="/admin/skills"
              className="ex-row"
              style={{ textDecoration: "none", color: "inherit", padding: 14 }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#b45309", fontSize: 18 }}>
                <FiList />
              </div>
              <div className="ex-info">
                <div className="ex-name" style={{ fontSize: 15 }}>Manage Community Skills</div>
                <div className="ex-swap">View and manage actual skills added to user profiles</div>
              </div>
              <FiArrowRight style={{ color: "var(--gray)" }} />
            </Link>

            <Link
              to="/admin/sessions"
              className="ex-row"
              style={{ textDecoration: "none", color: "inherit", padding: 14 }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#7e22ce", fontSize: 18 }}>
                <FiCalendar />
              </div>
              <div className="ex-info">
                <div className="ex-name" style={{ fontSize: 15 }}>Monitor Learning Sessions</div>
                <div className="ex-swap">Monitor upcoming & completed sessions with creator isolation</div>
              </div>
              <FiArrowRight style={{ color: "var(--gray)" }} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
