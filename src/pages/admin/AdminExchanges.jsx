import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  FiSearch,
  FiRepeat,
  FiEye,
  FiX,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiInfo,
  FiCalendar,
  FiUser,
  FiMail,
  FiMapPin,
  FiGlobe,
  FiExternalLink,
  FiAward,
  FiBookOpen,
  FiAlertCircle,
  FiXCircle,
  FiStar,
  FiLayers,
  FiCheck,
  FiRefreshCw
} from "react-icons/fi";
import SkillTag from "../../components/SkillTag";
import { fetchAdminExchangesAsync } from "../../redux/slices/adminSlice";

// Safe date formatters
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return String(dateStr);
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return String(dateStr);
  }
};

// Normalized status metadata helper
const getStatusMeta = (status) => {
  switch ((status || "").toLowerCase()) {
    case "active":
      return {
        label: "Active",
        color: "#1d4ed8",
        bg: "#dbeafe",
        border: "#bfdbfe",
        icon: <FiCheckCircle />
      };
    case "completed":
      return {
        label: "Completed",
        color: "#15803d",
        bg: "#dcfce7",
        border: "#bbf7d0",
        icon: <FiAward />
      };
    case "pending":
      return {
        label: "Pending",
        color: "#b45309",
        bg: "#fef3c7",
        border: "#fde68a",
        icon: <FiClock />
      };
    case "cancelled":
      return {
        label: "Cancelled",
        color: "#b91c1c",
        bg: "#fee2e2",
        border: "#fecaca",
        icon: <FiXCircle />
      };
    case "rejected":
      return {
        label: "Rejected",
        color: "#b91c1c",
        bg: "#fee2e2",
        border: "#fecaca",
        icon: <FiXCircle />
      };
    default:
      return {
        label: status || "Pending",
        color: "#4b5563",
        bg: "#f3f4f6",
        border: "#e5e7eb",
        icon: <FiInfo />
      };
  }
};

export default function AdminExchanges() {
  const exchanges = useSelector((s) => s.admin.platformExchanges || []);
  const loading = useSelector((s) => s.admin.loading);
  const error = useSelector((s) => s.admin.error);
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewingExchange, setViewingExchange] = useState(null);

  useEffect(() => {
    dispatch(fetchAdminExchangesAsync());
  }, [dispatch]);

  // Lock background scroll and support Escape key when the Inspect modal is open
  useEffect(() => {
    if (viewingExchange) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setViewingExchange(null);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [viewingExchange]);

  // Dynamic summary statistics calculated from database records
  const totalCount = exchanges.length;
  const pendingCount = exchanges.filter((e) => (e.status || "").toLowerCase() === "pending").length;
  const activeCount = exchanges.filter((e) => (e.status || "").toLowerCase() === "active").length;
  const completedCount = exchanges.filter((e) => (e.status || "").toLowerCase() === "completed").length;
  const cancelledCount = exchanges.filter((e) =>
    ["cancelled", "rejected"].includes((e.status || "").toLowerCase())
  ).length;

  const statCards = [
    { label: "Total Exchanges", count: totalCount, icon: <FiRepeat />, color: "#2563eb", filterKey: "All" },
    { label: "Pending", count: pendingCount, icon: <FiClock />, color: "#d97706", filterKey: "Pending" },
    { label: "Accepted (Active)", count: activeCount, icon: <FiCheckCircle />, color: "#4f46e5", filterKey: "Active" },
    { label: "Completed", count: completedCount, icon: <FiAward />, color: "#16a34a", filterKey: "Completed" },
    { label: "Rejected / Cancelled", count: cancelledCount, icon: <FiXCircle />, color: "#dc2626", filterKey: "Cancelled" },
  ];

  // Comprehensive multi-field filtering
  const filtered = exchanges.filter((ex) => {
    const q = search.trim().toLowerCase();
    const reqName = (ex.requesterName || (ex.requester && (ex.requester.fullName || ex.requester.name)) || "").toLowerCase();
    const reqEmail = (ex.requesterEmail || (ex.requester && ex.requester.email) || "").toLowerCase();
    const partnerName = (ex.partnerName || (ex.partner && (ex.partner.fullName || ex.partner.name)) || "").toLowerCase();
    const partnerEmail = (ex.partnerEmail || (ex.partner && ex.partner.email) || "").toLowerCase();
    const teach = (ex.teach || "").toLowerCase();
    const want = (ex.want || "").toLowerCase();
    const eid = String(ex._id || ex.id || "").toLowerCase();

    const matchesSearch =
      !q ||
      reqName.includes(q) ||
      reqEmail.includes(q) ||
      partnerName.includes(q) ||
      partnerEmail.includes(q) ||
      teach.includes(q) ||
      want.includes(q) ||
      eid.includes(q);

    const exStatus = (ex.status || "").toLowerCase();
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Pending" && exStatus === "pending") ||
      (statusFilter === "Active" && exStatus === "active") ||
      (statusFilter === "Completed" && exStatus === "completed") ||
      (statusFilter === "Cancelled" && (exStatus === "cancelled" || exStatus === "rejected"));

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      {/* 1. Page Header */}
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1>Exchange Management</h1>
          <p>Monitor community skill-exchange agreements and their progress.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-xs"
          onClick={() => dispatch(fetchAdminExchangesAsync())}
          title="Refresh exchanges"
          disabled={loading}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <FiRefreshCw style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          {loading ? "Refreshing..." : "↻ Refresh Exchanges"}
        </button>
      </div>

      {/* 2. Read-Only Admin Monitoring Notice */}
      <div
        className="dash-panel"
        style={{
          borderLeft: "4px solid #2563eb",
          background: "#eff6ff",
          marginBottom: 20,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <FiInfo style={{ color: "#2563eb", fontSize: 18, flexShrink: 0 }} />
        <p style={{ color: "#1e40af", margin: 0, fontSize: 13.5, lineHeight: 1.4 }}>
          <b>Read-Only Monitoring Mode:</b> Peer skill exchanges are collaborative agreements self-governed by community members. Administrators maintain read-only visibility into agreement commitments, milestone progress, and participant details.
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
            flexWrap: "wrap",
            gap: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#991b1b" }}>
            <FiAlertCircle style={{ fontSize: 18 }} />
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>Failed to load exchanges: {error}</span>
          </div>
          <button
            type="button"
            className="btn btn-xs"
            style={{ background: "#dc2626", color: "#fff", border: "none" }}
            onClick={() => dispatch(fetchAdminExchangesAsync())}
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Summary Statistics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        {statCards.map((s) => (
          <div
            key={s.label}
            className="stat-card"
            onClick={() => setStatusFilter(s.filterKey)}
            style={{
              background: "var(--surface)",
              cursor: "pointer",
              border: statusFilter === s.filterKey ? `2px solid ${s.color}` : "1px solid var(--border)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            title={`Filter by ${s.label}`}
          >
            <div className="stat-top">
              <span className="stat-label" style={{ fontSize: 12.5 }}>{s.label}</span>
              <span className="stat-icon" style={{ color: s.color, background: "rgba(0,0,0,0.04)" }}>
                {s.icon}
              </span>
            </div>
            <div className="stat-value" style={{ fontSize: 24, marginTop: 4 }}>
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
              padding: "0 14px",
              height: 38,
              boxSizing: "border-box",
              flex: "1 1 280px",
            }}
          >
            <FiSearch style={{ color: "var(--gray)", flexShrink: 0, fontSize: 15 }} />
            <input
              type="text"
              placeholder="Search by participant name, email, skill, or exchange ID..."
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
              >
                <FiX />
              </button>
            )}
          </div>

          {/* Status Filter Chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { id: "All", label: "All Actions", count: totalCount },
              { id: "Pending", label: "Pending", count: pendingCount },
              { id: "Active", label: "Active", count: activeCount },
              { id: "Completed", label: "Completed", count: completedCount },
              { id: "Cancelled", label: "Cancelled", count: cancelledCount },
            ].map((st) => {
              const isActive = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  className={`exchange-filter-btn ${isActive ? "active" : ""}`}
                  onClick={() => setStatusFilter(st.id)}
                  style={{
                    height: 38,
                    padding: "0 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    border: isActive ? "1.5px solid var(--black)" : "1.5px solid var(--border)",
                    background: isActive ? "var(--black)" : "var(--surface)",
                    color: isActive ? "#ffffff" : "var(--text)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    boxSizing: "border-box",
                  }}
                >
                  <span style={{ color: isActive ? "#ffffff" : "var(--text)" }}>{st.id === "All" ? "All" : st.label}</span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 10,
                      background: isActive ? "rgba(255, 255, 255, 0.22)" : "var(--bg)",
                      color: isActive ? "#ffffff" : "var(--gray)",
                      lineHeight: 1,
                    }}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Exchanges Container: Clean 8-Column Desktop Table & Mobile/Tablet Cards */}
      <div className="dash-panel" style={{ padding: 18 }}>
        {/* Desktop View (screens > 900px): Clean 8-column table (No horizontal scroll, No sticky column, all columns visible) */}
        <div className="exchanges-desktop-view">
          <div className="exchanges-table-wrap">
            <table className="exchanges-table">
              <thead>
                <tr>
                  <th style={{ width: "5%", textAlign: "center", padding: "11px 6px" }}>No.</th>
                  <th style={{ width: "16%", textAlign: "left", padding: "11px 8px" }}>Requester</th>
                  <th style={{ width: "16%", textAlign: "left", padding: "11px 8px" }}>Partner</th>
                  <th style={{ width: "19%", textAlign: "left", padding: "11px 8px" }}>Skills Exchanged</th>
                  <th style={{ width: "12%", textAlign: "left", padding: "11px 8px" }}>Learning Mode</th>
                  <th style={{ width: "10%", textAlign: "center", padding: "11px 6px" }}>Status</th>
                  <th style={{ width: "12%", textAlign: "left", padding: "11px 8px" }}>Created Date</th>
                  <th style={{ width: "10%", textAlign: "center", padding: "11px 6px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ex, index) => {
                  const rowNum = index + 1;
                  const eid = String(ex._id || ex.id || "");
                  const statusMeta = getStatusMeta(ex.status);

                  const reqName = ex.requesterName || (ex.requester && (ex.requester.fullName || ex.requester.name)) || "Member";
                  const reqEmail = ex.requesterEmail || (ex.requester && ex.requester.email) || "";
                  const reqPhoto = ex.requesterPhoto || (ex.requester && ex.requester.photo) || "https://randomuser.me/api/portraits/men/22.jpg";

                  const partName = ex.partnerName || (ex.partner && (ex.partner.fullName || ex.partner.name)) || "Partner";
                  const partEmail = ex.partnerEmail || (ex.partner && ex.partner.email) || "";
                  const partPhoto = ex.partnerPhoto || (ex.partner && ex.partner.photo) || "https://randomuser.me/api/portraits/women/28.jpg";

                  const mode = ex.mode || (ex.agreement && ex.agreement.mode) || "Online";
                  const meetingLocation = ex.meetingLocation || (ex.agreement && ex.agreement.location) || "";

                  return (
                    <tr key={eid || rowNum}>
                      {/* 1. Sequential Number (No.) */}
                      <td style={{ textAlign: "center", fontWeight: 700, fontSize: 12, color: "var(--gray)", padding: "11px 6px" }}>
                        {rowNum}
                      </td>

                      {/* 2. Requester */}
                      <td style={{ textAlign: "left", padding: "11px 8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <img
                            src={reqPhoto}
                            alt={reqName}
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
                              e.currentTarget.src = "https://randomuser.me/api/portraits/men/22.jpg";
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
                              title={reqName}
                            >
                              {reqName}
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
                              title={reqEmail || "Not provided"}
                            >
                              {reqEmail || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Partner */}
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

                      {/* 4. Skills Exchanged */}
                      <td style={{ textAlign: "left", padding: "11px 8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>
                          <span
                            title={`Offers / Teaches: ${ex.teach || "Skill"}`}
                            style={{
                              display: "inline-block",
                              background: "#fef3c7",
                              color: "#92400e",
                              border: "1px solid #fde68a",
                              borderRadius: 6,
                              padding: "3px 7px",
                              fontSize: 11.5,
                              fontWeight: 700,
                              maxWidth: "44%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {ex.teach || "Skill"}
                          </span>
                          <FiArrowRight style={{ color: "var(--gray)", fontSize: 11, flexShrink: 0 }} />
                          <span
                            title={`Requests / Wants: ${ex.want || "Skill"}`}
                            style={{
                              display: "inline-block",
                              background: "#f3f4f6",
                              color: "var(--text)",
                              border: "1px solid var(--border)",
                              borderRadius: 6,
                              padding: "3px 7px",
                              fontSize: 11.5,
                              fontWeight: 700,
                              maxWidth: "44%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {ex.want || "Skill"}
                          </span>
                        </div>
                      </td>

                      {/* 5. Learning Mode */}
                      <td style={{ textAlign: "left", padding: "11px 8px", whiteSpace: "nowrap" }}>
                        <div style={{ minWidth: 0, lineHeight: 1.35 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
                            {mode.toLowerCase() === "online" ? (
                              <FiGlobe style={{ color: "#2563eb", fontSize: 13, flexShrink: 0 }} />
                            ) : (
                              <FiMapPin style={{ color: "#d97706", fontSize: 13, flexShrink: 0 }} />
                            )}
                            {mode}
                          </span>
                          {meetingLocation && mode.toLowerCase() !== "online" && (
                            <div style={{ fontSize: 11, color: "var(--gray)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }} title={meetingLocation}>
                              {meetingLocation}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. Status */}
                      <td style={{ textAlign: "center", padding: "11px 6px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "3px 9px",
                              borderRadius: 10,
                              fontSize: 11.5,
                              fontWeight: 700,
                              textTransform: "capitalize",
                              background: statusMeta.bg,
                              color: statusMeta.color,
                              border: `1px solid ${statusMeta.border}`,
                              lineHeight: 1.2
                            }}
                          >
                            {statusMeta.icon}
                            {statusMeta.label}
                          </span>
                        </div>
                      </td>

                      {/* 7. Created Date */}
                      <td style={{ textAlign: "left", padding: "11px 8px", whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: 12, color: "var(--text-sec)" }}>
                          {formatDate(ex.createdAt)}
                        </div>
                      </td>

                      {/* 8. Actions (Inspect) - Fully visible, centered, non-sticky */}
                      <td style={{ textAlign: "center", whiteSpace: "nowrap", padding: "11px 6px" }}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <button
                            type="button"
                            className="btn-xs exchange-inspect-btn"
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              color: "var(--text)",
                              padding: "5px 11px",
                              borderRadius: 7,
                              fontSize: 12,
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                            }}
                            onClick={() => setViewingExchange(ex)}
                            title="Inspect exchange agreement details"
                          >
                            <FiEye style={{ fontSize: 12 }} /> Inspect
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "40px 16px", color: "var(--gray)" }}>
                      <FiRepeat style={{ fontSize: 32, marginBottom: 8, opacity: 0.45 }} />
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                        {search || statusFilter !== "All"
                          ? "No exchanges found matching your search or filter criteria."
                          : "No peer skill exchanges have been initiated yet."}
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
        <div className="exchanges-mobile-cards">
          {filtered.map((ex, index) => {
            const rowNum = index + 1;
            const eid = String(ex._id || ex.id || "");
            const statusMeta = getStatusMeta(ex.status);

            const reqName = ex.requesterName || (ex.requester && (ex.requester.fullName || ex.requester.name)) || "Member";
            const reqEmail = ex.requesterEmail || (ex.requester && ex.requester.email) || "";
            const reqPhoto = ex.requesterPhoto || (ex.requester && ex.requester.photo) || "https://randomuser.me/api/portraits/men/22.jpg";

            const partName = ex.partnerName || (ex.partner && (ex.partner.fullName || ex.partner.name)) || "Partner";
            const partEmail = ex.partnerEmail || (ex.partner && ex.partner.email) || "";
            const partPhoto = ex.partnerPhoto || (ex.partner && ex.partner.photo) || "https://randomuser.me/api/portraits/women/28.jpg";

            const mode = ex.mode || (ex.agreement && ex.agreement.mode) || "Online";

            return (
              <div
                key={eid || rowNum}
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
                {/* Card Top: Sequential Row Number (No.), Created Date, Status Badge */}
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
                    <span style={{ fontSize: 12, color: "var(--gray)" }}>
                      {formatDate(ex.createdAt)}
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
                    <img
                      src={reqPhoto}
                      alt={reqName}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                        border: "1.5px solid #a5b4fc",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                      }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://randomuser.me/api/portraits/men/22.jpg";
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 10, color: "var(--gray)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Requester</span>
                      <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={reqName}>{reqName}</div>
                      {reqEmail && <div style={{ fontSize: 11, color: "var(--gray)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{reqEmail}</div>}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <img
                      src={partPhoto}
                      alt={partName}
                      style={{
                        width: 32,
                        height: 32,
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
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 10, color: "var(--gray)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Partner</span>
                      <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={partName}>{partName}</div>
                      {partEmail && <div style={{ fontSize: 11, color: "var(--gray)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{partEmail}</div>}
                    </div>
                  </div>
                </div>

                {/* Skills Exchanged & Learning Mode */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <SkillTag yellow style={{ fontSize: 11.5, padding: "3px 8px" }}>{ex.teach || "Skill"}</SkillTag>
                    <FiArrowRight style={{ color: "var(--gray)", fontSize: 12 }} />
                    <SkillTag style={{ fontSize: 11.5, padding: "3px 8px" }}>{ex.want || "Skill"}</SkillTag>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--text-sec)" }}>
                    {mode.toLowerCase() === "online" ? <FiGlobe style={{ color: "#2563eb" }} /> : <FiMapPin style={{ color: "#d97706" }} />}
                    {mode}
                  </span>
                </div>

                {/* Inspect Action */}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setViewingExchange(ex)}
                  style={{ width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, marginTop: 2 }}
                >
                  <FiEye /> Inspect Agreement Details
                </button>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--gray)" }}>
              <FiRepeat style={{ fontSize: 32, marginBottom: 8, opacity: 0.45 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                {search || statusFilter !== "All"
                  ? "No exchanges found matching your search or filter criteria."
                  : "No peer skill exchanges have been initiated yet."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. Professional Inspect Exchange Modal */}
      {viewingExchange && (() => {
        const ex = viewingExchange;
        const eid = String(ex._id || ex.id || "N/A");
        const statusMeta = getStatusMeta(ex.status);
        const agreement = ex.agreement || {};

        const reqUser = ex.requester || {};
        const partUser = ex.partner || {};

        const reqName = ex.requesterName || reqUser.fullName || reqUser.name || "Member";
        const reqEmail = ex.requesterEmail || reqUser.email || "Email not available";
        const reqCity = ex.requesterCity || reqUser.city || reqUser.location || "Location not specified";
        const reqPhoto = ex.requesterPhoto || reqUser.photo || "https://randomuser.me/api/portraits/men/22.jpg";

        const partName = ex.partnerName || partUser.fullName || partUser.name || "Partner";
        const partEmail = ex.partnerEmail || partUser.email || "Email not available";
        const partCity = ex.partnerCity || partUser.city || partUser.location || "Location not specified";
        const partPhoto = ex.partnerPhoto || partUser.photo || "https://randomuser.me/api/portraits/women/28.jpg";

        const teachSkill = ex.teach || "Offered Skill";
        const wantSkill = ex.want || "Requested Skill";
        const totalSessions = ex.totalSessions || agreement.totalSessions || 4;
        const completedSessions = ex.completedSessions || 0;
        const progressPct = ex.progress || 0;
        const duration = ex.duration || agreement.duration || "1 Hour";
        const schedule = ex.schedule || agreement.schedule || "Weekly on mutually agreed time";
        const mode = ex.mode || agreement.mode || "Online";
        const meetingLink = ex.meetingLink || agreement.meetingLink || "";
        const meetingLocation = ex.meetingLocation || agreement.location || "";

        // Safe commitment descriptions without raw JSON or property names
        const requesterCommitmentText =
          agreement.myCommitment && typeof agreement.myCommitment === "string"
            ? agreement.myCommitment
            : `Will teach ${teachSkill} across ${totalSessions} sessions (${duration} each)`;

        const partnerCommitmentText =
          agreement.partnerCommitment && typeof agreement.partnerCommitment === "string"
            ? agreement.partnerCommitment
            : `${partName} will teach ${wantSkill} across ${totalSessions} sessions (${duration} each)`;

        const acceptedDate = agreement.acceptedAt
          ? agreement.acceptedAt
          : (ex.status === "active" || ex.status === "completed")
            ? formatDate(ex.updatedAt)
            : null;

        const sessionsList = Array.isArray(ex.sessions) ? ex.sessions : [];

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspect-exchange-title"
            className="modal-backdrop"
            onClick={() => setViewingExchange(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(17, 17, 17, 0.65)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
          >
            <div
              className="modal-box"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 720,
                width: "100%",
                maxHeight: "92vh",
                display: "flex",
                flexDirection: "column",
                background: "var(--surface)",
                borderRadius: 22,
                padding: 0,
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
                border: "1px solid var(--border)",
                boxSizing: "border-box",
              }}
            >
              {/* Modal Header: pinned */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "20px 26px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--surface)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h3 id="inspect-exchange-title" style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
                      Exchange Agreement Details
                    </h3>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "3px 10px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: "capitalize",
                        background: statusMeta.bg,
                        color: statusMeta.color,
                        border: `1px solid ${statusMeta.border}`
                      }}
                    >
                      {statusMeta.icon}
                      {statusMeta.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--gray)", marginTop: 4 }}>
                    Exchange ID: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>#{eid}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingExchange(null)}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "50%",
                    width: 34,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: 17,
                    color: "var(--gray)",
                    transition: "all 0.2s ease",
                    flexShrink: 0,
                  }}
                  aria-label="Close"
                  title="Close (Esc)"
                >
                  <FiX />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div
                style={{
                  overflowY: "auto",
                  padding: "22px 26px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  fontSize: 14,
                }}
              >
                {/* SECTION A: Skill Swap Highlight Bar */}
                <div
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 14,
                  }}
                >
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontSize: 11.5, color: "var(--gray)", fontWeight: 700, textTransform: "uppercase" }}>
                      Requester Teaches
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <SkillTag yellow>{teachSkill}</SkillTag>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: "var(--text)" }}>
                      {reqName}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "var(--gray)" }}>
                    <FiRepeat style={{ fontSize: 22, color: "#2563eb" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, marginTop: 2, textTransform: "uppercase" }}>
                      {mode}
                    </span>
                  </div>

                  <div style={{ minWidth: 160, textAlign: "right" }}>
                    <div style={{ fontSize: 11.5, color: "var(--gray)", fontWeight: 700, textTransform: "uppercase" }}>
                      Partner Teaches
                    </div>
                    <div style={{ marginTop: 4, display: "flex", justifyContent: "flex-end" }}>
                      <SkillTag>{wantSkill}</SkillTag>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: "var(--text)" }}>
                      {partName}
                    </div>
                  </div>
                </div>

                {/* SECTION B: Participants */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 13.5, fontWeight: 700, textTransform: "uppercase", color: "var(--gray)" }}>
                    Exchange Participants
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                    {/* Requester Profile Card */}
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        background: "var(--surface)",
                        display: "flex",
                        gap: 12,
                        alignItems: "center"
                      }}
                    >
                      <img
                        src={reqPhoto}
                        alt={reqName}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "2px solid #fde68a",
                          flexShrink: 0
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: "#fef3c7",
                            color: "#92400e"
                          }}
                        >
                          Requester (Initiator)
                        </span>
                        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4, color: "var(--ink)" }}>
                          {reqName}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--gray)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                          <FiMail style={{ flexShrink: 0 }} /> {reqEmail}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-sec)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                          <FiMapPin style={{ flexShrink: 0 }} /> {reqCity}
                        </div>
                      </div>
                    </div>

                    {/* Partner Profile Card */}
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        background: "var(--surface)",
                        display: "flex",
                        gap: 12,
                        alignItems: "center"
                      }}
                    >
                      <img
                        src={partPhoto}
                        alt={partName}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "2px solid #bfdbfe",
                          flexShrink: 0
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: "#dbeafe",
                            color: "#1e40af"
                          }}
                        >
                          Learning Partner (Receiver)
                        </span>
                        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4, color: "var(--ink)" }}>
                          {partName}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--gray)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                          <FiMail style={{ flexShrink: 0 }} /> {partEmail}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-sec)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                          <FiMapPin style={{ flexShrink: 0 }} /> {partCity}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION C: Agreement Terms & Commitments */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 13.5, fontWeight: 700, textTransform: "uppercase", color: "var(--gray)" }}>
                    Agreement Terms & Mutual Commitments
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                    {/* Requester's Commitment Card */}
                    <div
                      style={{
                        background: "#fffbeb",
                        border: "1px solid #fef3c7",
                        borderRadius: 12,
                        padding: "14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>
                          Requester's Commitment
                        </span>
                        <SkillTag yellow>{teachSkill}</SkillTag>
                      </div>
                      <div style={{ fontSize: 12.5, color: "#78350f" }}>
                        <b>Scope:</b> {totalSessions} sessions • {duration} each
                      </div>
                      <div
                        style={{
                          fontSize: 13.5,
                          color: "#92400e",
                          lineHeight: 1.45,
                          background: "rgba(255,255,255,0.7)",
                          padding: "8px 10px",
                          borderRadius: 8,
                          fontStyle: "italic"
                        }}
                      >
                        "{requesterCommitmentText}"
                      </div>
                    </div>

                    {/* Partner's Commitment Card */}
                    <div
                      style={{
                        background: "#eff6ff",
                        border: "1px solid #dbeafe",
                        borderRadius: 12,
                        padding: "14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>
                          Partner's Commitment
                        </span>
                        <SkillTag>{wantSkill}</SkillTag>
                      </div>
                      <div style={{ fontSize: 12.5, color: "#1e3a8a" }}>
                        <b>Scope:</b> {totalSessions} sessions • {duration} each
                      </div>
                      <div
                        style={{
                          fontSize: 13.5,
                          color: "#1e40af",
                          lineHeight: 1.45,
                          background: "rgba(255,255,255,0.7)",
                          padding: "8px 10px",
                          borderRadius: 8,
                          fontStyle: "italic"
                        }}
                      >
                        "{partnerCommitmentText}"
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION D: Session Arrangement */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 13.5, fontWeight: 700, textTransform: "uppercase", color: "var(--gray)" }}>
                    Session Arrangement & Delivery
                  </h4>
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "16px",
                      background: "var(--surface)",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 14
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 11.5, color: "var(--gray)", fontWeight: 600, textTransform: "uppercase" }}>
                        Learning Mode
                      </span>
                      <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                        {mode.toLowerCase() === "online" ? <FiGlobe style={{ color: "#2563eb" }} /> : <FiMapPin style={{ color: "#d97706" }} />}
                        {mode}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: 11.5, color: "var(--gray)", fontWeight: 600, textTransform: "uppercase" }}>
                        Session Duration
                      </span>
                      <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                        <FiClock style={{ color: "var(--gray)" }} />
                        {duration} per session
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: 11.5, color: "var(--gray)", fontWeight: 600, textTransform: "uppercase" }}>
                        Frequency & Schedule
                      </span>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>
                        {schedule}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: 11.5, color: "var(--gray)", fontWeight: 600, textTransform: "uppercase" }}>
                        Progress
                      </span>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3, color: progressPct === 100 ? "#16a34a" : "#2563eb" }}>
                        {completedSessions} / {totalSessions} Sessions ({progressPct}%)
                      </div>
                    </div>

                    {/* Online Meeting Link */}
                    {(mode.toLowerCase() === "online" || mode.toLowerCase() === "both") && (
                      <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <span style={{ fontSize: 11.5, color: "var(--gray)", fontWeight: 600, textTransform: "uppercase" }}>
                          Virtual Meeting Link
                        </span>
                        <div style={{ marginTop: 4 }}>
                          {meetingLink && meetingLink.startsWith("http") ? (
                            <a
                              href={meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#2563eb",
                                textDecoration: "underline",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontWeight: 600,
                                fontSize: 13.5
                              }}
                            >
                              <FiExternalLink /> {meetingLink}
                            </a>
                          ) : (
                            <span style={{ color: "var(--gray)", fontSize: 13.5 }}>
                              {meetingLink || "No virtual meeting link provided"}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Offline Physical Location */}
                    {(mode.toLowerCase() === "offline" || mode.toLowerCase() === "both") && (
                      <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <span style={{ fontSize: 11.5, color: "var(--gray)", fontWeight: 600, textTransform: "uppercase" }}>
                          Physical Location
                        </span>
                        <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--text)" }}>
                          <FiMapPin style={{ color: "#d97706" }} />
                          {meetingLocation || "Physical location not specified"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION E: Exchange Timeline */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 13.5, fontWeight: 700, textTransform: "uppercase", color: "var(--gray)" }}>
                    Exchange Lifecycle Timeline
                  </h4>
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "16px 20px",
                      background: "var(--bg)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12
                    }}
                  >
                    {/* 1. Requested */}
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "#dbeafe",
                          color: "#1d4ed8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          flexShrink: 0,
                          marginTop: 2
                        }}
                      >
                        ✓
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>Exchange Requested</div>
                        <div style={{ fontSize: 12, color: "var(--gray)" }}>
                          Submitted by <b>{reqName}</b> on {formatDateTime(ex.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* 2. Accepted or Pending Acceptance */}
                    {acceptedDate ? (
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "#dcfce7",
                            color: "#15803d",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            flexShrink: 0,
                            marginTop: 2
                          }}
                        >
                          ✓
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5 }}>Exchange Accepted</div>
                          <div style={{ fontSize: 12, color: "var(--gray)" }}>
                            Proposal accepted by <b>{partName}</b> — agreement activated on {formatDate(acceptedDate)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "#fef3c7",
                            color: "#b45309",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            flexShrink: 0,
                            marginTop: 2
                          }}
                        >
                          ⏳
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#b45309" }}>Awaiting Partner Acceptance</div>
                          <div style={{ fontSize: 12, color: "var(--gray)" }}>
                            Pending response from {partName}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. Progress / Milestones */}
                    {completedSessions > 0 && (
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "#dbeafe",
                            color: "#1d4ed8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            flexShrink: 0,
                            marginTop: 2
                          }}
                        >
                          ★
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5 }}>Sessions In Progress</div>
                          <div style={{ fontSize: 12, color: "var(--gray)" }}>
                            {completedSessions} of {totalSessions} planned sessions completed ({progressPct}% complete)
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. Completed */}
                    {(ex.status || "").toLowerCase() === "completed" && (
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "#dcfce7",
                            color: "#15803d",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            flexShrink: 0,
                            marginTop: 2
                          }}
                        >
                          🏆
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#15803d" }}>Exchange Completed</div>
                          <div style={{ fontSize: 12, color: "var(--gray)" }}>
                            All agreed learning milestones successfully concluded on {formatDateTime(ex.updatedAt)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 5. Cancelled or Rejected */}
                    {["cancelled", "rejected"].includes((ex.status || "").toLowerCase()) && (
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "#fee2e2",
                            color: "#b91c1c",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            flexShrink: 0,
                            marginTop: 2
                          }}
                        >
                          ✕
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#b91c1c" }}>
                            {ex.status === "rejected" ? "Proposal Declined" : "Exchange Cancelled"}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--gray)" }}>
                            Agreement closed on {formatDateTime(ex.updatedAt)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION F: Additional Information (Planned Milestones & Review) */}
                {sessionsList.length > 0 && (
                  <div>
                    <h4 style={{ margin: "0 0 10px 0", fontSize: 13.5, fontWeight: 700, textTransform: "uppercase", color: "var(--gray)" }}>
                      Planned Session Milestones ({sessionsList.length})
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {sessionsList.map((s, idx) => (
                        <div
                          key={s._id || idx}
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                            background: s.status === "completed" ? "#f0fdf4" : "var(--surface)"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                background: s.status === "completed" ? "#16a34a" : "var(--border)",
                                color: s.status === "completed" ? "#fff" : "var(--text)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 700
                              }}
                            >
                              {s.sessionNum || idx + 1}
                            </span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.title || `Session ${idx + 1}`}</div>
                              {s.topic && <div style={{ fontSize: 12, color: "var(--gray)" }}>{s.topic}</div>}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {s.date && (
                              <span style={{ fontSize: 12, color: "var(--text-sec)", display: "flex", alignItems: "center", gap: 4 }}>
                                <FiCalendar /> {s.date} {s.time ? `• ${s.time}` : ""}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 10,
                                textTransform: "uppercase",
                                background: s.status === "completed" ? "#dcfce7" : "#f3f4f6",
                                color: s.status === "completed" ? "#15803d" : "#6b7280"
                              }}
                            >
                              {s.status === "completed" ? "Completed" : "Upcoming"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rating & Review if completed */}
                {(ex.rating || ex.review) && (
                  <div
                    style={{
                      background: "#fefce8",
                      border: "1px solid #fef08a",
                      borderRadius: 12,
                      padding: "14px 16px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#854d0e", fontSize: 13 }}>
                      <FiStar fill="#eab308" stroke="#ca8a04" />
                      Partner Feedback & Community Rating: {ex.rating ? `${ex.rating} / 5.0` : "Rated"}
                    </div>
                    {ex.review && (
                      <div style={{ marginTop: 6, fontSize: 13.5, color: "#713f12", fontStyle: "italic" }}>
                        "{ex.review}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer: pinned */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 26px",
                  borderTop: "1px solid var(--border)",
                  background: "var(--surface)",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--gray)" }}>
                  Last Updated: {formatDateTime(ex.updatedAt)}
                </div>
                <button
                  type="button"
                  className="btn btn-dark btn-sm"
                  onClick={() => setViewingExchange(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
