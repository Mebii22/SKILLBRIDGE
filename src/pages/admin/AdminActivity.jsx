import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  FiSearch,
  FiActivity,
  FiUserCheck,
  FiUserX,
  FiTrash2,
  FiCheckCircle,
  FiRotateCcw,
  FiClock,
  FiX,
  FiShield,
  FiEye,
  FiRefreshCw,
  FiInfo,
  FiTag,
  FiCalendar
} from "react-icons/fi";
import { fetchAdminActivitiesAsync } from "../../redux/slices/adminSlice";
import {
  getActivityCategory,
  isUserActivity,
  isSkillActivity
} from "../../utils/activityClassifier";

export default function AdminActivity() {
  const activities = useSelector((s) => s.admin.activities || []);
  const loading = useSelector((s) => s.admin.loading);
  const error = useSelector((s) => s.admin.error);
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [viewingActivity, setViewingActivity] = useState(null);

  useEffect(() => {
    dispatch(fetchAdminActivitiesAsync());
  }, [dispatch]);

  // Modal behavior: Escape key to close & background scroll lock
  useEffect(() => {
    if (viewingActivity) {
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setViewingActivity(null);
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [viewingActivity]);

  // Category counts calculated from centralized classification function (Single Source of Truth)
  const allCount = activities.length;
  const userCount = activities.filter(isUserActivity).length;
  const skillCount = activities.filter(isSkillActivity).length;

  const filterTabs = [
    { id: "All", label: "All Actions", count: allCount },
    { id: "Users", label: "User Actions", count: userCount },
    { id: "Skills", label: "Skills Actions", count: skillCount }
  ];

  // Multi-field search and category filtering using single source of truth
  const filtered = activities.filter((a) => {
    // 1. Category Classification Check
    let matchesCategory = true;
    if (categoryFilter === "Users") {
      matchesCategory = isUserActivity(a);
    } else if (categoryFilter === "Skills") {
      matchesCategory = isSkillActivity(a);
    }

    if (!matchesCategory) return false;

    // 2. Search Query Check
    const q = search.trim().toLowerCase();
    if (!q) return true;

    const act = (a.action || "").toLowerCase();
    const adminName = (a.adminName || (a.admin && (a.admin.fullName || a.admin.name)) || "").toLowerCase();
    const adminEmail = (a.admin && a.admin.email ? a.admin.email : "").toLowerCase();
    const targetType = (a.targetType || "").toLowerCase();
    const targetName = (a.targetName || "").toLowerCase();
    const targetId = (a.targetId || "").toLowerCase();
    const reason = (a.reason || "").toLowerCase();
    const text = (a.text || "").toLowerCase();
    const aid = String(a._id || a.id || "").toLowerCase();

    return (
      act.includes(q) ||
      adminName.includes(q) ||
      adminEmail.includes(q) ||
      targetType.includes(q) ||
      targetName.includes(q) ||
      targetId.includes(q) ||
      reason.includes(q) ||
      text.includes(q) ||
      aid.includes(q)
    );
  });

  const getActionMeta = (action = "", text = "") => {
    const act = (action || "").toUpperCase().trim();
    const txt = (text || "").toLowerCase().trim();

    if (act === "USER_ACTIVATED" || (!act && (txt.includes("activated") || txt.includes("reactivated")))) {
      return {
        label: "User Activated",
        color: "#15803d",
        bg: "#dcfce7",
        border: "#bbf7d0",
        icon: <FiUserCheck style={{ fontSize: 13, flexShrink: 0 }} />
      };
    }
    if (act === "USER_DISABLED" || (!act && txt.includes("disabled"))) {
      return {
        label: "User Disabled",
        color: "#b45309",
        bg: "#fef3c7",
        border: "#fde68a",
        icon: <FiUserX style={{ fontSize: 13, flexShrink: 0 }} />
      };
    }
    if (act === "USER_DELETED" || (!act && (txt.includes("permanently removed") || txt.includes("deleted")) && txt.includes("user"))) {
      return {
        label: "User Deleted",
        color: "#dc2626",
        bg: "#fee2e2",
        border: "#fecaca",
        icon: <FiTrash2 style={{ fontSize: 13, flexShrink: 0 }} />
      };
    }
    if (act === "SKILL_REMOVED" || (!act && txt.includes("removed") && txt.includes("skill"))) {
      return {
        label: "Skill Removed",
        color: "#b91c1c",
        bg: "#fee2e2",
        border: "#fecaca",
        icon: <FiTrash2 style={{ fontSize: 13, flexShrink: 0 }} />
      };
    }
    if (act === "SKILL_RESTORED" || (!act && txt.includes("restored") && txt.includes("skill"))) {
      return {
        label: "Skill Restored",
        color: "#0f766e",
        bg: "#ccfbf1",
        border: "#99f6e4",
        icon: <FiRotateCcw style={{ fontSize: 13, flexShrink: 0 }} />
      };
    }
    if (act === "SKILL_APPROVED" || (!act && txt.includes("approved") && txt.includes("skill"))) {
      return {
        label: "Skill Approved",
        color: "#15803d",
        bg: "#dcfce7",
        border: "#bbf7d0",
        icon: <FiCheckCircle style={{ fontSize: 13, flexShrink: 0 }} />
      };
    }
    if (act === "REPORT_RESOLVED" || (!act && txt.includes("report"))) {
      return {
        label: "Report Resolved",
        color: "#1d4ed8",
        bg: "#dbeafe",
        border: "#bfdbfe",
        icon: <FiCheckCircle style={{ fontSize: 13, flexShrink: 0 }} />
      };
    }
    if (act === "SYSTEM_NOTICE") {
      return {
        label: "System Notice",
        color: "#4338ca",
        bg: "#e0e7ff",
        border: "#c7d2fe",
        icon: <FiShield style={{ fontSize: 13, flexShrink: 0 }} />
      };
    }
    return {
      label: action || "Audit Action",
      color: "#4f46e5",
      bg: "#e0e7ff",
      border: "#c7d2fe",
      icon: <FiActivity style={{ fontSize: 13, flexShrink: 0 }} />
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recorded";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return String(dateStr);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    } catch {
      return "";
    }
  };

  const formatFullDateTime = (dateStr) => {
    if (!dateStr) return "Not recorded";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <>
      {/* 1. Page Header */}
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1>Admin Activity Log</h1>
          <p>Immutable audit trail of administrative moderation actions, user status modifications, and skill updates.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-xs"
          onClick={() => dispatch(fetchAdminActivitiesAsync())}
          title="Refresh audit activities"
          disabled={loading}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <FiRefreshCw style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          {loading ? "Refreshing..." : "↻ Refresh Audit Log"}
        </button>
      </div>

      {/* 2. Strict Audit Read-Only Oversight Notice */}
      <div
        className="dash-panel"
        style={{
          borderLeft: "4px solid #0284c7",
          background: "#f0f9ff",
          marginBottom: 20,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <FiShield style={{ color: "#0284c7", fontSize: 20, flexShrink: 0 }} />
        <p style={{ color: "#0369a1", margin: 0, fontSize: 13.5, lineHeight: 1.4 }}>
          <b>Security & Audit Trail Integrity:</b> All administrative activities are automatically recorded and cryptographically timestamped. Audit records are permanently append-only and strictly read-only to ensure complete transparency and compliance.
        </p>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div
          className="dash-panel"
          style={{
            borderLeft: "4px solid #dc2626",
            background: "#fef2f2",
            marginBottom: 20,
            padding: "12px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FiInfo style={{ color: "#dc2626", fontSize: 18 }} />
            <span style={{ color: "#991b1b", fontSize: 14, fontWeight: 500 }}>
              {typeof error === "string" ? error : "Failed to load activity logs"}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-xs"
            onClick={() => dispatch(fetchAdminActivitiesAsync())}
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Search and Action Category Filters Bar */}
      <div className="dash-panel" style={{ padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          {/* Search Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--bg)",
              border: "1.5px solid var(--border)",
              borderRadius: 10,
              padding: "0 14px",
              height: 38,
              boxSizing: "border-box",
              flex: "1 1 280px",
              minWidth: 220,
            }}
          >
            <FiSearch style={{ color: "var(--gray)", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by action, administrator, target user, reason, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                width: "100%",
                fontSize: 13.5,
                color: "var(--text)",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--gray)", padding: 0 }}
                aria-label="Clear search"
                title="Clear search"
              >
                <FiX />
              </button>
            )}
          </div>

          {/* Action Category Filter Chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {filterTabs.map((tab) => {
              const isActive = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`activity-filter-btn ${isActive ? "active" : ""}`}
                  onClick={() => setCategoryFilter(tab.id)}
                  style={{
                    height: 38,
                    padding: "0 15px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    border: isActive ? "1.5px solid var(--black)" : "1.5px solid var(--border)",
                    background: isActive ? "var(--black)" : "var(--surface)",
                    color: isActive ? "#ffffff" : "var(--text)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    boxSizing: "border-box",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap"
                  }}
                  title={`Filter by ${tab.label}`}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      background: isActive ? "rgba(255,255,255,0.22)" : "var(--bg)",
                      color: isActive ? "#ffffff" : "var(--gray)",
                      padding: "2px 7px",
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1,
                      border: isActive ? "1px solid rgba(255,255,255,0.3)" : "1px solid var(--border)"
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Activity Container: Clean Five-Column Desktop Table & Mobile/Tablet Cards */}
      <div className="dash-panel" style={{ padding: 18 }}>
        {/* Desktop View (screens > 900px): Clean five-column table (No horizontal scroll, 100% viewport fit) */}
        <div className="activity-desktop-view">
          <div className="activity-table-wrap">
            <table className="activity-table">
              <thead>
                <tr>
                  <th style={{ width: "15%", textAlign: "left", padding: "12px 10px" }}>Timestamp</th>
                  <th style={{ width: "14%", textAlign: "left", padding: "12px 10px" }}>Action</th>
                  <th style={{ width: "15%", textAlign: "left", padding: "12px 10px" }}>Administrator</th>
                  <th style={{ width: "16%", textAlign: "left", padding: "12px 10px" }}>Target</th>
                  <th style={{ width: "40%", textAlign: "left", padding: "12px 10px" }}>Details & Reason</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const aid = String(a._id || a.id || "");
                  const meta = getActionMeta(a.action, a.text);
                  const adminName = a.adminName || (a.admin && (a.admin.fullName || a.admin.name)) || "SKILLBRIDGE Admin";
                  const adminEmail = (a.admin && a.admin.email) || "";
                  const targetType = a.targetType || "Entity";
                  const targetName = a.targetName || a.targetId || "Item";

                  return (
                    <tr key={aid}>
                      {/* 1. Timestamp */}
                      <td style={{ textAlign: "left", padding: "12px 10px" }}>
                        <div style={{ minWidth: 0, lineHeight: 1.35 }}>
                          <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--ink)", whiteSpace: "nowrap" }}>
                            {formatDate(a.createdAt)}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                            <FiClock style={{ fontSize: 11, flexShrink: 0 }} />
                            <span>{formatTime(a.createdAt) || a.time || "Recently"}</span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Action */}
                      <td style={{ textAlign: "left", padding: "12px 10px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 9px",
                            borderRadius: 10,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`,
                            whiteSpace: "nowrap"
                          }}
                          title={a.action || meta.label}
                        >
                          {meta.icon}
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      {/* 3. Administrator */}
                      <td style={{ textAlign: "left", padding: "12px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              background: "#0f172a",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              flexShrink: 0,
                              boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                            }}
                          >
                            <FiShield />
                          </div>
                          <div style={{ minWidth: 0, flex: 1, lineHeight: 1.35 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 13,
                                color: "var(--ink)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                              title={adminName}
                            >
                              {adminName}
                            </div>
                            {adminEmail && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--gray)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}
                                title={adminEmail}
                              >
                                {adminEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Target */}
                      <td style={{ textAlign: "left", padding: "12px 10px" }}>
                        <div style={{ minWidth: 0, lineHeight: 1.35 }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: 10,
                                fontWeight: 800,
                                color: "var(--gray)",
                                textTransform: "uppercase",
                                background: "var(--bg)",
                                border: "1px solid var(--border)",
                                borderRadius: 4,
                                padding: "1px 5px",
                                letterSpacing: "0.03em"
                              }}
                            >
                              {targetType}
                            </span>
                          </div>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              color: "var(--ink)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                            title={targetName}
                          >
                            {targetName}
                          </div>
                        </div>
                      </td>

                      {/* 5. Details & Reason with Integrated Inspect Action */}
                      <td style={{ textAlign: "left", padding: "12px 10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, width: "100%" }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.4 }}>
                              {a.text || `${a.action || "Action"} completed successfully`}
                            </div>
                            {a.reason && (
                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: 11.5,
                                  color: "#991b1b",
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                                title={`Reason: ${a.reason}`}
                              >
                                <span style={{ fontWeight: 700 }}>Reason:</span>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                                  {a.reason}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Inspect Action Button */}
                          <button
                            type="button"
                            className="btn-xs activity-inspect-btn"
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              color: "var(--text)",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 4,
                              cursor: "pointer",
                              flexShrink: 0,
                              transition: "all 0.15s ease",
                              whiteSpace: "nowrap"
                            }}
                            onClick={() => setViewingActivity(a)}
                            title="Inspect complete audit activity record"
                          >
                            <FiEye style={{ fontSize: 12 }} />
                            <span>Inspect</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "40px 16px", color: "var(--gray)" }}>
                      <FiActivity style={{ fontSize: 32, marginBottom: 8, opacity: 0.45 }} />
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                        {search || categoryFilter !== "All"
                          ? "No audit activity logs match your search or filter criteria."
                          : "No administrative activity recorded yet."}
                      </p>
                      {(search || categoryFilter !== "All") && (
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => {
                            setSearch("");
                            setCategoryFilter("All");
                          }}
                          style={{ marginTop: 10 }}
                        >
                          Reset Search & Filters
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile & Tablet Card Layout (screens <= 900px): Clean responsive cards, zero horizontal scroll */}
        <div className="activity-mobile-cards">
          {filtered.map((a) => {
            const aid = String(a._id || a.id || "");
            const meta = getActionMeta(a.action, a.text);
            const adminName = a.adminName || (a.admin && (a.admin.fullName || a.admin.name)) || "SKILLBRIDGE Admin";
            const adminEmail = (a.admin && a.admin.email) || "";
            const targetType = a.targetType || "Entity";
            const targetName = a.targetName || a.targetId || "Item";

            return (
              <div
                key={aid}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12
                }}
              >
                {/* Card Top: Timestamp & Action Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4 }}>
                    <FiCalendar style={{ fontSize: 11 }} /> {formatDate(a.createdAt)} • {formatTime(a.createdAt) || a.time || "Recently"}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: 10,
                      fontSize: 11.5,
                      fontWeight: 700,
                      background: meta.bg,
                      color: meta.color,
                      border: `1px solid ${meta.border}`
                    }}
                  >
                    {meta.icon} {meta.label}
                  </span>
                </div>

                {/* Actor & Target Grid */}
                <div
                  style={{
                    background: "var(--bg)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    alignItems: "center"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "#0f172a",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        flexShrink: 0
                      }}
                    >
                      <FiShield />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 10, color: "var(--gray)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Admin</span>
                      <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminName}</div>
                      {adminEmail && <div style={{ fontSize: 11, color: "var(--gray)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminEmail}</div>}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 10, color: "var(--gray)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Target [{targetType}]</span>
                    <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={targetName}>{targetName}</div>
                  </div>
                </div>

                {/* Details & Reason */}
                <div>
                  <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>
                    {a.text || `${a.action || "Action"} completed successfully`}
                  </div>
                  {a.reason && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11.5,
                        color: "#991b1b",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        padding: "3px 8px",
                        borderRadius: 4,
                        display: "inline-block"
                      }}
                    >
                      <b>Reason:</b> {a.reason}
                    </div>
                  )}
                </div>

                {/* Inspect Action */}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setViewingActivity(a)}
                  style={{ width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, marginTop: 2 }}
                >
                  <FiEye /> Inspect Audit Record
                </button>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--gray)" }}>
              <FiActivity style={{ fontSize: 32, marginBottom: 8, opacity: 0.45 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                {search || categoryFilter !== "All"
                  ? "No audit activity logs match your search or filter criteria."
                  : "No administrative activity recorded yet."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Professional Inspect Activity Modal */}
      {viewingActivity && (() => {
        const a = viewingActivity;
        const aid = String(a._id || a.id || "N/A");
        const meta = getActionMeta(a.action, a.text);
        const adminName = a.adminName || (a.admin && (a.admin.fullName || a.admin.name)) || "SKILLBRIDGE Admin";
        const adminEmail = (a.admin && a.admin.email) || "admin@skillbridge.com";
        const targetType = a.targetType || "System Entity";
        const targetName = a.targetName || a.targetId || "Not specified";
        const targetIdStr = a.targetId || "";

        return (
          <div
            className="modal-backdrop"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(17, 17, 17, 0.65)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              boxSizing: "border-box"
            }}
            onClick={() => setViewingActivity(null)}
          >
            <div
              className="dash-panel modal-box"
              style={{
                width: "100%",
                maxWidth: 640,
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#fff",
                borderRadius: 18,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                margin: 0,
                padding: 0,
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  background: "var(--cream)",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Inspect Audit Activity</h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--gray)" }}>
                    Verified audit record of administrative action, moderation justification, and target metadata.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingActivity(null)}
                  style={{
                    background: "var(--surface)",
                    cursor: "pointer",
                    color: "var(--gray)",
                    padding: 6,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border)",
                    transition: "all 0.15s ease",
                  }}
                  aria-label="Close activity inspection"
                  title="Close (Esc)"
                >
                  <FiX style={{ fontSize: 18 }} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
                {/* SECTION A: Activity Overview */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray)" }}>
                        Action Type
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 10px",
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 700,
                            background: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`
                          }}
                        >
                          {meta.icon}
                          <span>{meta.label}</span>
                        </span>
                        {a.action && (
                          <span style={{ fontSize: 11.5, color: "var(--gray)", fontFamily: "monospace", fontWeight: 600 }}>
                            ({a.action})
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray)" }}>
                        Technical ID
                      </span>
                      <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--ink)", fontWeight: 700, marginTop: 4 }}>
                        #{aid.slice(-8)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--gray)" }}>
                    <span>
                      <b>Full Timestamp:</b> {formatFullDateTime(a.createdAt)}
                    </span>
                    <span>
                      <b>Relative Time:</b> {a.time || "Recently"}
                    </span>
                  </div>
                </div>

                {/* SECTION B: Administrator Details */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray)" }}>
                    Executing Administrator
                  </h4>
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "#0f172a",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        flexShrink: 0
                      }}
                    >
                      <FiShield />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{adminName}</div>
                      <div style={{ fontSize: 12, color: "var(--gray)", marginTop: 1 }}>{adminEmail}</div>
                      <div style={{ fontSize: 11, color: "var(--text-sec)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 600 }}>Role:</span> Platform Administrator • <span style={{ fontFamily: "monospace" }}>ID: {a.admin?._id ? `#${String(a.admin._id).slice(-8)}` : "System"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION C: Target Entity Details */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray)" }}>
                    Target Entity Specification
                  </h4>
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "14px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 600, display: "block" }}>Target Category</span>
                      <div style={{ marginTop: 4 }}>
                        <span
                          style={{
                            display: "inline-block",
                            background: "var(--bg)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            padding: "2px 8px",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--ink)"
                          }}
                        >
                          {targetType}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 600, display: "block" }}>Target Identifier / Name</span>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={targetName}>
                        {targetName}
                      </div>
                    </div>

                    {targetIdStr && (
                      <div style={{ gridColumn: "1 / -1", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 600, display: "block" }}>Target Record ID</span>
                        <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text)", marginTop: 2 }}>
                          {targetIdStr}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION D: Description & Moderation Reason */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray)" }}>
                    Action Description & Moderation Reason
                  </h4>
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 600, display: "block" }}>Complete Description</span>
                      <p style={{ margin: "4px 0 0 0", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>
                        {a.text || "No descriptive summary was attached to this audit log."}
                      </p>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 600, display: "block" }}>Administrative Reason</span>
                      {a.reason ? (
                        <div
                          style={{
                            marginTop: 4,
                            padding: "10px 14px",
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: 8,
                            color: "#991b1b",
                            fontSize: 13,
                            lineHeight: 1.4,
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                          }}
                        >
                          <FiInfo style={{ fontSize: 16, marginTop: 2, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontWeight: 700 }}>Recorded Justification: </span>
                            <span>{a.reason}</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12.5, color: "var(--gray)", fontStyle: "italic", marginTop: 4 }}>
                          No specific justification was recorded for this administrative action.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION E: Audit Integrity & Security */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    fontSize: 11.5,
                    color: "var(--gray)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <FiShield style={{ color: "#0284c7", fontSize: 14 }} />
                    <span><b>Audit Integrity:</b> Cryptographically logged audit entry. Immutable record.</span>
                  </div>
                  <span style={{ fontFamily: "monospace" }}>
                    MongoID: {aid}
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "14px 24px",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "flex-end",
                  background: "var(--cream)",
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setViewingActivity(null)}
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
