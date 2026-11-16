import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiUsers, FiRepeat, FiList, FiFlag, FiArrowRight } from "react-icons/fi";

export default function AdminDashboard() {
  const users = useSelector((s) => s.user.users);
  const exchanges = useSelector((s) => s.exchanges.exchanges);
  const skillListings = useSelector((s) => s.admin.skillListings);
  const reports = useSelector((s) => s.admin.reports);
  const activities = useSelector((s) => s.admin.activities);

  const stats = [
    { label: "Total Users", value: users.length, icon: <FiUsers /> },
    { label: "Active Exchanges", value: exchanges.filter((e) => e.status === "active").length, icon: <FiRepeat /> },
    { label: "Skill Listings", value: skillListings.length, icon: <FiList /> },
    { label: "Open Reports", value: reports.filter((r) => r.status === "open").length, icon: <FiFlag /> },
  ];

  return (
    <>
      <div className="page-head">
        <h1>Platform Overview</h1>
        <p>Welcome back, admin. Here’s what’s happening on SkillBridge.</p>
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

      {/* Platform Exchanges & Agreements Table */}
      <div className="dash-panel">
        <div className="panel-title">
          <div>
            <h3>Platform Skill Exchanges & Agreements</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--gray)" }}>
              Monitor structured learning agreements, progress, and exchange modes
            </p>
          </div>
          <span className="status-pill st-active">{exchanges.length} Total Exchanges</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Partner</th>
                <th>Skill Swap</th>
                <th>Mode</th>
                <th>Sessions & Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {exchanges.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="t-user">
                      <img src={e.partnerPhoto} alt={e.partnerName} />
                      {e.partnerName}
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
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                      {e.completedSessions || 0} / {e.totalSessions || 4} sessions ({e.progress || 0}%)
                    </div>
                    <div className="progress" style={{ width: 110, height: 6 }}>
                      <i style={{ width: `${e.progress || 0}%` }} />
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill st-${e.status}`}>
                      {e.status === "active" ? "Active" : e.status === "pending" ? "Pending" : e.status === "completed" ? "Completed" : e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dash-panel">
        <div className="panel-title">
          <h3>Recent Users</h3>
          <Link to="/admin/users" className="panel-link">View all <FiArrowRight /></Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>User</th><th>Email</th><th>Joined</th><th>Status</th></tr>
            </thead>
            <tbody>
              {users.slice(0, 5).map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="t-user">
                      <img src={u.photo} alt={u.name} />
                      {u.name}
                    </div>
                  </td>
                  <td className="t-mail">{u.email}</td>
                  <td>{u.joined}</td>
                  <td><span className={`status-pill ${u.status === "Active" ? "st-completed" : "st-cancelled"}`}>{u.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="admin-grid">
        <div className="dash-panel">
          <div className="panel-title">
            <h3>Recent Reports</h3>
            <Link to="/admin/reports" className="panel-link">View all <FiArrowRight /></Link>
          </div>
          {reports.slice(0, 4).map((r) => (
            <div className="ex-row" key={r.id}>
              <div className="ex-info">
                <div className="ex-name" style={{ fontSize: 15 }}>{r.target}</div>
                <div className="ex-swap">{r.reason} · {r.date}</div>
              </div>
              <span className={`status-pill ${r.status === "open" ? "st-pending" : r.status === "resolved" ? "st-completed" : "st-active"}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>

        <div className="dash-panel">
          <div className="panel-title"><h3>Platform Activity</h3></div>
          <div className="timeline">
            {activities.map((a, i) => (
              <div className="tl-item done" key={i}>
                <span className="tl-dot" />
                <div className="tl-title" style={{ fontWeight: 600, fontSize: 13.5 }}>{a.text}</div>
                <div className="tl-sub">{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
