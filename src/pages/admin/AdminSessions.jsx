import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  FiSearch,
  FiCalendar,
  FiClock,
  FiVideo,
  FiMapPin,
  FiX,
  FiInfo,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiExternalLink,
  FiRefreshCw,
  FiRepeat,
  FiShield,
  FiFileText
} from "react-icons/fi";
import { fetchAdminSessionsAsync } from "../../redux/slices/adminSlice";

export default function AdminSessions() {
  const sessions = useSelector((s) => s.admin.platformSessions || []);
  const loading = useSelector((s) => s.admin.loading);
  const error = useSelector((s) => s.admin.error);
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewingSession, setViewingSession] = useState(null);

  useEffect(() => {
    dispatch(fetchAdminSessionsAsync());
  }, [dispatch]);

  // Modal behavior: Escape key to close & background scroll lock
  useEffect(() => {
    if (viewingSession) {
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setViewingSession(null);
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
  }, [viewingSession]);

  // Dynamic summary statistics calculated from database records
  const totalCount = sessions.length;
  const upcomingCount = sessions.filter((s) => (s.status || "").toLowerCase() === "upcoming").length;
  const completedCount = sessions.filter((s) => (s.status || "").toLowerCase() === "completed").length;
  const cancelledCount = sessions.filter((s) => (s.status || "").toLowerCase() === "cancelled").length;

  const statCards = [
    { label: "Total Sessions", count: totalCount, icon: <FiCalendar />, color: "#2563eb", filterKey: "All" },
    { label: "Upcoming", count: upcomingCount, icon: <FiClock />, color: "#d97706", filterKey: "Upcoming" },
    { label: "Completed", count: completedCount, icon: <FiCheckCircle />, color: "#16a34a", filterKey: "Completed" },
    { label: "Cancelled", count: cancelledCount, icon: <FiXCircle />, color: "#dc2626", filterKey: "Cancelled" },
  ];

  // Multi-field search and status filtering
  const filtered = sessions.filter((s) => {
    const q = search.trim().toLowerCase();
    const hostName = (s.creatorName || s.userName || (s.user && (s.user.fullName || s.user.name)) || "").toLowerCase();
    const hostEmail = (s.creatorEmail || s.userEmail || (s.user && s.user.email) || "").toLowerCase();
    const partnerName = (s.partnerName || (s.partner && (s.partner.fullName || s.partner.name)) || "").toLowerCase();
    const partnerEmail = (s.partnerEmail || (s.partner && s.partner.email) || "").toLowerCase();
    const skill = (s.skill || "").toLowerCase();
    const mode = (s.mode || "").toLowerCase();
    const location = (s.meetingLocation || "").toLowerCase();
    const sid = String(s._id || s.id || "").toLowerCase();

    const matchesSearch =
      !q ||
      hostName.includes(q) ||
      hostEmail.includes(q) ||
      partnerName.includes(q) ||
      partnerEmail.includes(q) ||
      skill.includes(q) ||
      mode.includes(q) ||
      location.includes(q) ||
      sid.includes(q);

    const sStatus = (s.status || "").toLowerCase();
    const matchesStatus =
      statusFilter === "All" ||
      sStatus === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusMeta = (status) => {
    const st = (status || "").toLowerCase();
    switch (st) {
      case "completed":
        return {
          label: "Completed",
          color: "#15803d",
          bg: "#dcfce7",
          border: "#bbf7d0",
          icon: <FiCheckCircle style={{ fontSize: 13 }} />
        };
      case "cancelled":
        return {
          label: "Cancelled",
          color: "#b91c1c",
          bg: "#fee2e2",
          border: "#fecaca",
          icon: <FiXCircle style={{ fontSize: 13 }} />
        };
      case "upcoming":
      default:
        return {
          label: "Upcoming",
          color: "#1d4ed8",
          bg: "#dbeafe",
          border: "#bfdbfe",
          icon: <FiClock style={{ fontSize: 13 }} />
        };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Scheduled";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const formatFullDateTime = (dateStr) => {
    if (!dateStr) return "Not provided";
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
          <h1>Session Monitoring</h1>
          <p>Real-time calendar monitoring of scheduled and completed peer-to-peer learning sessions.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-xs"
          onClick={() => dispatch(fetchAdminSessionsAsync())}
          title="Refresh sessions"
          disabled={loading}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <FiRefreshCw style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          {loading ? "Refreshing..." : "↻ Refresh Sessions"}
        </button>
      </div>

      {/* 2. Strict Creator Ownership & Monitoring Oversight Notice */}
      <div
        className="dash-panel"
        style={{
          borderLeft: "4px solid #7c3aed",
          background: "#faf5ff",
          marginBottom: 20,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <FiShield style={{ color: "#7c3aed", fontSize: 20, flexShrink: 0 }} />
        <p style={{ color: "#5b21b6", margin: 0, fontSize: 13.5, lineHeight: 1.4 }}>
          <b>Strict Creator Ownership:</b> Peer learning sessions are self-governed by community members. Sessions are strictly scheduled, rescheduled, completed, or cancelled only by their creators. Administrators maintain read-only visibility for platform integrity and dispute review.
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
              {typeof error === "string" ? error : "Failed to load sessions"}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-xs"
            onClick={() => dispatch(fetchAdminSessionsAsync())}
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Database-Driven Summary Cards */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {statCards.map((s) => (
          <div
            key={s.label}
            className="dash-panel stat-card"
            onClick={() => setStatusFilter(s.filterKey)}
            style={{
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              outline: statusFilter === s.filterKey ? `2px solid ${s.color}` : "none",
            }}
            title={`Filter by ${s.label}`}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="stat-label" style={{ fontWeight: 600, fontSize: 13 }}>
                {s.label}
              </span>
              <div
                className="stat-icon"
                style={{
                  background: `${s.color}15`,
                  color: s.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  fontSize: 16,
                }}
              >
                {s.icon}
              </div>
            </div>
            <div className="stat-value" style={{ fontSize: 26, fontWeight: 800 }}>
              {loading ? "..." : s.count}
            </div>
          </div>
        ))}
      </div>

      {/* 4. Search and Status Filters Bar */}
      <div className="dash-panel" style={{ padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 14px",
              flex: "1 1 280px",
            }}
          >
            <FiSearch style={{ color: "var(--gray)", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by host, partner, skill, mode, or session ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                width: "100%",
                fontSize: 14,
                color: "var(--text)",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--gray)", padding: 0 }}
                aria-label="Clear search"
              >
                <FiX />
              </button>
            )}
          </div>

          {/* Status Filter Chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "All", label: `All (${totalCount})` },
              { id: "Upcoming", label: `Upcoming (${upcomingCount})` },
              { id: "Completed", label: `Completed (${completedCount})` },
              { id: "Cancelled", label: `Cancelled (${cancelledCount})` },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  border: statusFilter === st.id ? "1px solid var(--black)" : "1px solid var(--border)",
                  background: statusFilter === st.id ? "var(--black)" : "var(--surface)",
                  color: statusFilter === st.id ? "#fff" : "var(--text)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Sessions Container: Clean 8-Column Desktop Table & Mobile/Tablet Cards */}
      <div className="dash-panel" style={{ padding: 18 }}>
        {/* Desktop View (screens > 900px): Clean 8-column table (No horizontal scroll, zero sticky columns, 100% viewport fit) */}
        <div className="sessions-desktop-view">
          <div className="sessions-table-wrap">
            <table className="sessions-table">
              <thead>
                <tr>
                  <th style={{ width: "4%", textAlign: "center", padding: "11px 6px" }}>No.</th>
                  <th style={{ width: "18%", textAlign: "left", padding: "11px 8px" }}>Skill / Topic</th>
                  <th style={{ width: "16%", textAlign: "left", padding: "11px 8px" }}>Host / Creator</th>
                  <th style={{ width: "16%", textAlign: "left", padding: "11px 8px" }}>Partner</th>
                  <th style={{ width: "13%", textAlign: "left", padding: "11px 8px" }}>Scheduled Date & Time</th>
                  <th style={{ width: "12%", textAlign: "left", padding: "11px 8px" }}>Mode / Location</th>
                  <th style={{ width: "11%", textAlign: "center", padding: "11px 6px" }}>Status</th>
                  <th style={{ width: "10%", textAlign: "center", padding: "11px 6px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, index) => {
                  const rowNum = index + 1;
                  const sid = String(s._id || s.id || "");
                  const statusMeta = getStatusMeta(s.status);

                  const hostName = s.creatorName || s.userName || (s.user && (s.user.fullName || s.user.name)) || "Host";
                  const hostEmail = s.creatorEmail || s.userEmail || (s.user && s.user.email) || "";
                  const hostPhoto = s.creatorPhoto || s.userPhoto || (s.user && s.user.photo) || "https://randomuser.me/api/portraits/men/32.jpg";

                  const partName = s.partnerName || (s.partner && (s.partner.fullName || s.partner.name)) || "Partner";
                  const partEmail = s.partnerEmail || (s.partner && s.partner.email) || "";
                  const partPhoto = s.partnerPhoto || (s.partner && s.partner.photo) || "https://randomuser.me/api/portraits/women/28.jpg";

                  const isOnline = (s.mode || "").toLowerCase().includes("online") || Boolean(s.meetingLink);
                  const locationSubtext = isOnline
                    ? (s.meetingLink ? "Google Meet" : "Link pending")
                    : (s.meetingLocation || "Location pending");

                  return (
                    <tr key={sid || rowNum}>
                      {/* 1. Sequential Number (No.) */}
                      <td style={{ textAlign: "center", fontWeight: 700, fontSize: 12, color: "var(--gray)", padding: "11px 6px" }}>
                        {rowNum}
                      </td>

                      {/* 2. Skill / Topic */}
                      <td style={{ textAlign: "left", padding: "11px 8px" }}>
                        <div style={{ minWidth: 0, lineHeight: 1.35 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color: "var(--ink)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                            title={s.skill}
                          >
                            {s.skill}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                            <FiClock style={{ fontSize: 11, flexShrink: 0 }} />
                            <span>{s.duration || "1 Hour"}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Host / Creator */}
                      <td style={{ textAlign: "left", padding: "11px 8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <img
                            src={hostPhoto}
                            alt={hostName}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              objectFit: "cover",
                              flexShrink: 0,
                              border: "1.5px solid #a5b4fc",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "https://randomuser.me/api/portraits/men/32.jpg";
                            }}
                          />
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
                              title={hostName}
                            >
                              {hostName}
                            </div>
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "var(--gray)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                marginTop: 1
                              }}
                              title={hostEmail || "Not provided"}
                            >
                              {hostEmail || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 4. Partner */}
                      <td style={{ textAlign: "left", padding: "11px 8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <img
                            src={partPhoto}
                            alt={partName}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              objectFit: "cover",
                              flexShrink: 0,
                              border: "1.5px solid #7dd3fc",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "https://randomuser.me/api/portraits/women/28.jpg";
                            }}
                          />
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
                              title={partName}
                            >
                              {partName}
                            </div>
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "var(--gray)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                marginTop: 1
                              }}
                              title={partEmail || "Not provided"}
                            >
                              {partEmail || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 5. Scheduled Date & Time */}
                      <td style={{ textAlign: "left", padding: "11px 8px" }}>
                        <div style={{ minWidth: 0, lineHeight: 1.35 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 12.5,
                              color: "var(--ink)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {formatDate(s.date)}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                            <FiClock style={{ fontSize: 11, flexShrink: 0 }} />
                            <span>{s.time || "TBD"}</span>
                          </div>
                        </div>
                      </td>

                      {/* 6. Mode / Location */}
                      <td style={{ textAlign: "left", padding: "11px 8px" }}>
                        <div style={{ minWidth: 0, lineHeight: 1.35 }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                            {isOnline ? (
                              <FiVideo style={{ color: "#2563eb", fontSize: 12.5, flexShrink: 0 }} />
                            ) : (
                              <FiMapPin style={{ color: "#d97706", fontSize: 12.5, flexShrink: 0 }} />
                            )}
                            <span>{isOnline ? "Online Video" : "In-Person"}</span>
                          </div>
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "var(--gray)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              marginTop: 1
                            }}
                            title={s.meetingLink || s.meetingLocation || locationSubtext}
                          >
                            {locationSubtext}
                          </div>
                        </div>
                      </td>

                      {/* 7. Status */}
                      <td style={{ textAlign: "center", padding: "11px 6px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            padding: "3px 9px",
                            borderRadius: 10,
                            fontSize: 11.5,
                            fontWeight: 700,
                            textTransform: "capitalize",
                            background: statusMeta.bg,
                            color: statusMeta.color,
                            border: `1px solid ${statusMeta.border}`,
                            whiteSpace: "nowrap"
                          }}
                        >
                          {statusMeta.icon}
                          <span>{statusMeta.label}</span>
                        </span>
                      </td>

                      {/* 8. Actions (Inspect) */}
                      <td style={{ textAlign: "center", padding: "11px 6px", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="btn-xs session-inspect-btn"
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
                            transition: "all 0.15s ease",
                            whiteSpace: "nowrap"
                          }}
                          onClick={() => setViewingSession(s)}
                          title="Inspect complete session agreement details"
                        >
                          <FiEye style={{ fontSize: 12 }} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "40px 16px", color: "var(--gray)" }}>
                      <FiCalendar style={{ fontSize: 32, marginBottom: 8, opacity: 0.45 }} />
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                        {search || statusFilter !== "All"
                          ? "No sessions found matching your search or filter criteria."
                          : "No peer learning sessions have been scheduled yet."}
                      </p>
                      {(search || statusFilter !== "All") && (
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => {
                            setSearch("");
                            setStatusFilter("All");
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
        <div className="sessions-mobile-cards">
          {filtered.map((s, index) => {
            const rowNum = index + 1;
            const sid = String(s._id || s.id || "");
            const statusMeta = getStatusMeta(s.status);

            const hostName = s.creatorName || s.userName || (s.user && (s.user.fullName || s.user.name)) || "Host";
            const hostEmail = s.creatorEmail || s.userEmail || (s.user && s.user.email) || "";
            const hostLocation = s.creatorLocation || s.userLocation || (s.user && (s.user.city || s.user.location)) || "";
            const hostPhoto = s.creatorPhoto || s.userPhoto || (s.user && s.user.photo) || "https://randomuser.me/api/portraits/men/32.jpg";

            const partName = s.partnerName || (s.partner && (s.partner.fullName || s.partner.name)) || "Partner";
            const partEmail = s.partnerEmail || (s.partner && s.partner.email) || "";
            const partLocation = s.partnerLocation || (s.partner && (s.partner.city || s.partner.location)) || "";
            const partPhoto = s.partnerPhoto || (s.partner && s.partner.photo) || "https://randomuser.me/api/portraits/women/28.jpg";

            const isOnline = (s.mode || "").toLowerCase().includes("online") || Boolean(s.meetingLink);
            const locationSubtext = isOnline
              ? (s.meetingLink ? "Google Meet" : "Online Video")
              : (s.meetingLocation || "Physical Location");

            return (
              <div
                key={sid || rowNum}
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
                {/* Card Top: Sequential Row Number (No.), Scheduled Date & Time, Status Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "2px 8px",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "var(--ink)"
                      }}
                    >
                      No. {rowNum}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4 }}>
                      <FiCalendar style={{ fontSize: 11 }} /> {formatDate(s.date)} • {s.time || "TBD"}
                    </span>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: 10,
                      fontSize: 11.5,
                      fontWeight: 700,
                      textTransform: "capitalize",
                      background: statusMeta.bg,
                      color: statusMeta.color,
                      border: `1px solid ${statusMeta.border}`
                    }}
                  >
                    {statusMeta.icon} {statusMeta.label}
                  </span>
                </div>

                {/* Skill & Duration */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
                    {s.skill}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {s.duration && (
                      <span style={{ fontSize: 12, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4 }}>
                        <FiClock style={{ fontSize: 11 }} /> {s.duration}
                      </span>
                    )}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--text-sec)" }}>
                      {isOnline ? <FiVideo style={{ color: "#2563eb" }} /> : <FiMapPin style={{ color: "#d97706" }} />}
                      {locationSubtext}
                    </span>
                  </div>
                </div>

                {/* Participants Grid */}
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
                    <img src={hostPhoto} alt={hostName} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 10, color: "var(--gray)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Host / Creator</span>
                      <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={hostName}>{hostName}</div>
                      {hostEmail && <div style={{ fontSize: 11, color: "var(--gray)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hostEmail}</div>}
                      {hostLocation && <div style={{ fontSize: 10.5, color: "var(--gray)" }}>📍 {hostLocation}</div>}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <img src={partPhoto} alt={partName} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 10, color: "var(--gray)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Partner</span>
                      <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={partName}>{partName}</div>
                      {partEmail && <div style={{ fontSize: 11, color: "var(--gray)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{partEmail}</div>}
                      {partLocation && <div style={{ fontSize: 10.5, color: "var(--gray)" }}>📍 {partLocation}</div>}
                    </div>
                  </div>
                </div>

                {/* Inspect Action */}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setViewingSession(s)}
                  style={{ width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, marginTop: 2 }}
                >
                  <FiEye /> Inspect Session Details
                </button>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--gray)" }}>
              <FiCalendar style={{ fontSize: 32, marginBottom: 8, opacity: 0.45 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                {search || statusFilter !== "All"
                  ? "No sessions found matching your search or filter criteria."
                  : "No peer learning sessions have been scheduled yet."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. Professional Inspect Session Modal */}
      {viewingSession && (() => {
        const s = viewingSession;
        const sid = String(s._id || s.id || "N/A");
        const statusMeta = getStatusMeta(s.status);

        const hostName = s.creatorName || s.userName || (s.user && (s.user.fullName || s.user.name)) || "Session Host";
        const hostEmail = s.creatorEmail || s.userEmail || (s.user && s.user.email) || "";
        const hostLocation = s.creatorLocation || s.userLocation || (s.user && (s.user.city || s.user.location)) || "";
        const hostPhoto = s.creatorPhoto || s.userPhoto || (s.user && s.user.photo) || "https://randomuser.me/api/portraits/men/32.jpg";

        const partName = s.partnerName || (s.partner && (s.partner.fullName || s.partner.name)) || "Learning Partner";
        const partEmail = s.partnerEmail || (s.partner && s.partner.email) || "";
        const partLocation = s.partnerLocation || (s.partner && (s.partner.city || s.partner.location)) || "";
        const partPhoto = s.partnerPhoto || (s.partner && s.partner.photo) || "https://randomuser.me/api/portraits/women/28.jpg";

        const isOnline = (s.mode || "").toLowerCase().includes("online") || Boolean(s.meetingLink);
        const meetingUrl = s.meetingLink || "";
        const locationStr = s.meetingLocation || "";

        const relatedExchange = s.exchange || null;
        const exchangeIdStr = String(s.exchangeId || (relatedExchange && relatedExchange._id) || "");

        // Section E completion info
        const isCompleted = (s.status || "").toLowerCase() === "completed";
        const isCancelled = (s.status || "").toLowerCase() === "cancelled";
        let completionText = "Session is currently upcoming. Completion status will be recorded upon session conclusion.";
        if (isCompleted) {
          const completedAtStr = s.updatedAt ? formatFullDateTime(s.updatedAt) : "Date not recorded";
          completionText = `Session was marked as completed on ${completedAtStr}.`;
        } else if (isCancelled) {
          completionText = "Session was marked as cancelled.";
        }

        const sessionNotes = s.notes || s.description || "";

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
            onClick={() => setViewingSession(null)}
          >
            <div
              className="dash-panel modal-box"
              style={{
                width: "100%",
                maxWidth: 680,
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
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Inspect Learning Session</h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--gray)" }}>
                    Comprehensive oversight of session specifications, participants, and agreement terms.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingSession(null)}
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
                  aria-label="Close session inspection"
                  title="Close (Esc)"
                >
                  <FiX style={{ fontSize: 18 }} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
                {/* SECTION A: Session Overview */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray)" }}>
                        Session Topic
                      </span>
                      <h3 style={{ margin: "4px 0 0 0", fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>
                        {s.skill || "Not provided"}
                      </h3>
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 12px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: "capitalize",
                        background: statusMeta.bg,
                        color: statusMeta.color,
                        border: `1px solid ${statusMeta.border}`,
                      }}
                    >
                      {statusMeta.icon} {statusMeta.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--gray)" }}>
                    <span>
                      <b>Created Date:</b> {formatFullDateTime(s.createdAt)}
                    </span>
                    <span title={`Full MongoDB ID: ${sid}`}>
                      <b>Technical ID:</b> #{sid.slice(-8)}
                    </span>
                  </div>
                </div>

                {/* SECTION B: Participants */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray)" }}>
                    Session Participants
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {/* Host Profile Card */}
                    <div
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "14px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <img
                        src={hostPhoto}
                        alt={hostName}
                        style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #6366f1" }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#4f46e5", textTransform: "uppercase", display: "block" }}>
                          Session Host / Creator
                        </span>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }} title={hostName}>
                          {hostName}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--gray)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }} title={hostEmail || "Not provided"}>
                          {hostEmail || "Not provided"}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-sec)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <FiMapPin style={{ fontSize: 11, flexShrink: 0 }} /> {hostLocation || "Not provided"}
                        </div>
                      </div>
                    </div>

                    {/* Partner Profile Card */}
                    <div
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "14px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <img
                        src={partPhoto}
                        alt={partName}
                        style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #0ea5e9" }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", display: "block" }}>
                          Learning Partner
                        </span>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }} title={partName}>
                          {partName}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--gray)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }} title={partEmail || "Not provided"}>
                          {partEmail || "Not provided"}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-sec)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <FiMapPin style={{ fontSize: 11, flexShrink: 0 }} /> {partLocation || "Not provided"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION C: Schedule Details */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray)" }}>
                    Schedule & Meeting Details
                  </h4>
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "16px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 14,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 600, display: "block" }}>Scheduled Date</span>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <FiCalendar style={{ color: "#2563eb", flexShrink: 0 }} /> {formatDate(s.date)}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 600, display: "block" }}>Start Time</span>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <FiClock style={{ color: "#d97706", flexShrink: 0 }} /> {s.time || "Not provided"}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 600, display: "block" }}>Duration</span>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <FiClock style={{ color: "var(--gray)", flexShrink: 0 }} /> {s.duration || "Not provided"}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 600, display: "block" }}>Learning Mode</span>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        {isOnline ? (
                          <FiVideo style={{ color: "#2563eb", flexShrink: 0 }} />
                        ) : (
                          <FiMapPin style={{ color: "#d97706", flexShrink: 0 }} />
                        )}
                        {s.mode || (isOnline ? "Online Video" : "In-Person")}
                      </div>
                    </div>
                  </div>

                  {/* Meeting Link or Physical Location Box */}
                  <div
                    style={{
                      background: isOnline ? "#eff6ff" : "#fffbeb",
                      border: isOnline ? "1px solid #bfdbfe" : "1px solid #fde68a",
                      borderRadius: 12,
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                      marginTop: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: isOnline ? "#dbeafe" : "#fef3c7",
                          color: isOnline ? "#2563eb" : "#d97706",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        {isOnline ? <FiVideo /> : <FiMapPin />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: isOnline ? "#1e40af" : "#92400e" }}>
                          {isOnline ? "Meeting Link" : "Meeting Venue / Location"}
                        </div>
                        <div style={{ fontSize: 12, color: isOnline ? "#3b82f6" : "#b45309", wordBreak: "break-all" }}>
                          {isOnline ? (meetingUrl || "Not provided") : (locationStr || "Not provided")}
                        </div>
                      </div>
                    </div>

                    {isOnline && meetingUrl && (
                      <a
                        href={meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-xs"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "#2563eb",
                          borderColor: "#bfdbfe",
                          background: "#fff",
                        }}
                      >
                        <FiExternalLink /> Open Meeting Link
                      </a>
                    )}
                  </div>
                </div>

                {/* SECTION D: Related Exchange */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray)" }}>
                    Associated Skill Exchange
                  </h4>
                  {relatedExchange || exchangeIdStr ? (
                    <div
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <FiRepeat style={{ color: "#4f46e5", fontSize: 16, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                              {relatedExchange?.teach || "Exchange Skill"} ↔ {relatedExchange?.want || "Partner Skill"}
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--gray)", marginTop: 2 }}>
                              Exchange Status: <b style={{ textTransform: "capitalize" }}>{relatedExchange?.status || "Active"}</b>
                            </div>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 11.5,
                            background: "var(--bg)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            padding: "4px 8px",
                            color: "var(--gray)",
                            fontWeight: 600,
                          }}
                        >
                          Exchange #{exchangeIdStr ? exchangeIdStr.slice(-8) : "Linked"}
                        </span>
                      </div>

                      {/* Agreement Details if available */}
                      {relatedExchange?.agreement && (
                        <div style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, color: "var(--text-sec)", marginTop: 4 }}>
                          <b>Agreement Terms:</b> {relatedExchange.agreement.totalSessions || 4} total sessions • {relatedExchange.agreement.duration || "1 Hour"} each ({relatedExchange.agreement.mode || "Online"})
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "var(--bg)",
                        border: "1px dashed var(--border)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        fontSize: 12.5,
                        color: "var(--gray)",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <FiInfo style={{ fontSize: 16, flexShrink: 0 }} />
                      <span>
                        <b>Direct Peer Learning Session:</b> Scheduled directly between {hostName} and {partName} as an independent learning session (No exchange agreement linked).
                      </span>
                    </div>
                  )}
                </div>

                {/* SECTION E: Session Information & Notes */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray)" }}>
                    Session Information & Completion Status
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
                      <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                        Description / Notes
                      </span>
                      <p style={{ margin: "4px 0 0 0", fontSize: 13, color: sessionNotes ? "var(--ink)" : "var(--gray)", fontStyle: sessionNotes ? "normal" : "italic" }}>
                        {sessionNotes || "Not provided"}
                      </p>
                    </div>

                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                      <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                        Completion Information
                      </span>
                      <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--ink)" }}>
                        {completionText}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Read-Only Administrative Safeguard */}
                <div
                  style={{
                    background: "#faf5ff",
                    border: "1px solid #e9d5ff",
                    borderRadius: 10,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <FiShield style={{ color: "#7c3aed", fontSize: 18, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 12, color: "#6b21a8", lineHeight: 1.4 }}>
                    <b>Administrative Read-Only Access:</b> Session scheduling, milestone progression, and status updates are governed exclusively by the participants. Administrators maintain read-only visibility for platform oversight and user support.
                  </p>
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
                  onClick={() => setViewingSession(null)}
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
