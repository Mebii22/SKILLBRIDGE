import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  FiSearch,
  FiUserX,
  FiUserCheck,
  FiTrash2,
  FiEye,
  FiX,
  FiAlertTriangle,
  FiMapPin,
  FiStar,
  FiMail,
  FiCalendar
} from "react-icons/fi";
import SkillTag from "../../components/SkillTag";
import {
  fetchAdminUsersAsync,
  toggleAdminUserStatusAsync,
  deleteAdminUserAsync
} from "../../redux/slices/adminSlice";

// Compact skill cell with first 2 skills, "+N" badge, tooltip for hidden skills, and layout protection
function SkillsCell({ skills = [], yellow = false }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, placement: "top" });
  const badgeRef = useRef(null);

  useEffect(() => {
    if (!showTooltip) return;
    const handleDismiss = (e) => {
      if (badgeRef.current && badgeRef.current.contains(e.target)) return;
      setShowTooltip(false);
    };
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("click", handleDismiss);
    return () => {
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("click", handleDismiss);
    };
  }, [showTooltip]);

  if (!skills || skills.length === 0) {
    return <span style={{ color: "var(--gray)", fontSize: 12, fontStyle: "italic" }}>—</span>;
  }

  const displayedSkills = skills.slice(0, 2);
  const hiddenSkills = skills.slice(2);
  const hiddenCount = hiddenSkills.length;
  const tooltipText = hiddenSkills.join(", ");

  const updatePosition = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      const placeAbove = rect.top > 120;
      const centeredX = rect.left + rect.width / 2;
      const safeX = Math.max(130, Math.min(window.innerWidth - 130, centeredX));
      setTooltipPos({
        top: placeAbove ? rect.top - 8 : rect.bottom + 8,
        left: safeX,
        placement: placeAbove ? "top" : "bottom"
      });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    updatePosition();
    setShowTooltip((prev) => !prev);
  };

  return (
    <div className="mini-tags">
      {displayedSkills.map((t) => (
        <span
          key={t}
          className={`tag ${yellow ? "yellow" : ""}`}
          title={t}
          style={{
            maxWidth: 125,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "inline-block",
            verticalAlign: "middle"
          }}
        >
          {t}
        </span>
      ))}
      {hiddenCount > 0 && (
        <>
          <button
            ref={badgeRef}
            type="button"
            className="skill-more-badge"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            title={tooltipText}
            aria-label={`${hiddenCount} more skills: ${tooltipText}`}
          >
            +{hiddenCount}
          </button>
          {showTooltip &&
            createPortal(
              <div
                className="skill-floating-tooltip"
                role="tooltip"
                style={{
                  position: "fixed",
                  top: tooltipPos.top,
                  left: tooltipPos.left,
                  transform: tooltipPos.placement === "top"
                    ? "translate(-50%, -100%)"
                    : "translate(-50%, 0)",
                  background: "#111",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: 10,
                  fontSize: "12px",
                  fontWeight: 500,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
                  zIndex: 99999,
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  minWidth: 120,
                  maxWidth: 260
                }}
              >
                <div
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: yellow ? "#facc15" : "#60a5fa",
                    marginBottom: 2
                  }}
                >
                  +{hiddenCount} More {yellow ? "Offered" : "Wanted"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {hiddenSkills.map((s) => (
                    <div
                      key={s}
                      style={{
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        lineHeight: 1.35,
                        color: "#f3f4f6"
                      }}
                    >
                      • {s}
                    </div>
                  ))}
                </div>
              </div>,
              document.body
            )}
        </>
      )}
    </div>
  );
}

export default function Users() {
  const users = useSelector((s) => s.admin.users || []);
  const loading = useSelector((s) => s.admin.loading);
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewingUser, setViewingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    dispatch(fetchAdminUsersAsync());
  }, [dispatch]);

  // Prevent background page scrolling and support Escape key while a modal is open
  useEffect(() => {
    const isModalOpen = Boolean(viewingUser || deletingUser);
    if (isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          if (!isDeleting) {
            setViewingUser(null);
            setDeletingUser(null);
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [viewingUser, deletingUser, isDeleting]);

  const handleToggleStatus = async (user) => {
    const uid = user._id || user.id;
    try {
      const res = await dispatch(toggleAdminUserStatusAsync(uid)).unwrap();
      const statusText = res.status === "Disabled" ? "disabled" : "reactivated";
      setActionMsg(`User '${user.fullName || user.name}' was successfully ${statusText}.`);
      setTimeout(() => setActionMsg(""), 4000);
    } catch (err) {
      alert(err || "Failed to update user status");
    }
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!deletingUser || !deleteReason.trim()) return;

    setIsDeleting(true);
    const uid = deletingUser._id || deletingUser.id;
    try {
      await dispatch(deleteAdminUserAsync({ id: uid, reason: deleteReason.trim() })).unwrap();
      setActionMsg(`User '${deletingUser.fullName || deletingUser.name}' was permanently deleted and related records were cleaned up.`);
      setDeletingUser(null);
      setDeleteReason("");
      setTimeout(() => setActionMsg(""), 4500);
    } catch (err) {
      alert(err || "Failed to delete user account");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered users list
  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    const teachesList = u.teaches || u.skillsOffered || [];
    const wantsList = u.wants || u.skillsWanted || [];
    const matchesSearch =
      !q ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.city && u.city.toLowerCase().includes(q)) ||
      teachesList.some((s) => s && s.toLowerCase().includes(q)) ||
      wantsList.some((s) => s && s.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === "All" ||
      u.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = users.filter((u) => u.status === "Active").length;
  const disabledCount = users.filter((u) => u.status === "Disabled").length;

  return (
    <>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1>User Management</h1>
          <p>Review community members, manage account states, and handle permanent deletions.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-xs"
          onClick={() => dispatch(fetchAdminUsersAsync())}
        >
          ↻ Refresh List
        </button>
      </div>

      {actionMsg && (
        <div className="dash-panel" style={{ borderLeft: "4px solid #16a34a", background: "#f0fdf4", padding: "12px 16px", marginBottom: 18 }}>
          <p style={{ color: "#166534", margin: 0, fontSize: 14, fontWeight: 500 }}>
            {actionMsg}
          </p>
        </div>
      )}

      {/* Controls: Search and Filter Tabs */}
      <div className="dash-panel" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div className="search-bar" style={{ minWidth: 260, maxWidth: 380, flex: 1, margin: 0 }}>
            <FiSearch />
            <input
              type="text"
              placeholder="Search by name, email or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray)", fontSize: 13 }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`chip ${statusFilter === "All" ? "active" : ""}`}
              onClick={() => setStatusFilter("All")}
            >
              All ({users.length})
            </button>
            <button
              type="button"
              className={`chip ${statusFilter === "Active" ? "active" : ""}`}
              onClick={() => setStatusFilter("Active")}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={`chip ${statusFilter === "Disabled" ? "active" : ""}`}
              onClick={() => setStatusFilter("Disabled")}
            >
              Disabled ({disabledCount})
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="dash-panel" style={{ padding: 18 }}>
        <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Registered Community Members</h3>
          <span style={{ fontSize: 13, color: "var(--gray)" }}>{filtered.length} found</span>
        </div>

        {loading && users.length === 0 ? (
          <p style={{ color: "var(--gray)", padding: "16px 0" }}>Loading registered users...</p>
        ) : filtered.length === 0 ? (
          <div className="empty" style={{ padding: "28px 0", textAlign: "center" }}>
            <p style={{ margin: 0, color: "var(--gray)" }}>No users match the active search or status filters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Skills Offered</th>
                  <th>Skills Wanted</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const uid = u._id || u.id;
                  const isAct = u.status === "Active";
                  const avatar = u.photo || "https://randomuser.me/api/portraits/men/22.jpg";

                  return (
                    <tr key={uid}>
                      <td>
                        <div className="t-user">
                          <img src={avatar} alt={u.name} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.fullName || u.name}</div>
                            <div className="t-mail" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <FiMapPin style={{ fontSize: 11 }} /> {u.city || u.location || "Kerala"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="t-mail">{u.email}</td>
                      <td>
                        <SkillsCell skills={u.teaches || u.skillsOffered || []} yellow={true} />
                      </td>
                      <td>
                        <SkillsCell skills={u.wants || u.skillsWanted || []} yellow={false} />
                      </td>
                      <td>
                        <span className={`status-pill ${isAct ? "st-completed" : "st-cancelled"}`}>
                          {u.status || "Active"}
                        </span>
                      </td>
                      <td className="t-mail" style={{ whiteSpace: "nowrap" }}>
                        {u.joined || (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Member")}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn-xs"
                            onClick={() => setViewingUser(u)}
                            title="View Full Profile Details"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            <FiEye /> View
                          </button>
                          <button
                            type="button"
                            className={`btn-xs ${isAct ? "danger" : "dark"}`}
                            onClick={() => handleToggleStatus(u)}
                            title={isAct ? "Disable Account" : "Reactivate Account"}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            {isAct ? <><FiUserX /> Disable</> : <><FiUserCheck /> Reactivate</>}
                          </button>
                          <button
                            type="button"
                            className="btn-xs"
                            style={{
                              background: "transparent",
                              color: "#dc2626",
                              border: "1px solid #fca5a5",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4
                            }}
                            onClick={() => {
                              setDeletingUser(u);
                              setDeleteReason("");
                            }}
                            title="Permanently Delete Account"
                          >
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: User Profile Details Modal */}
      {viewingUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-profile-title"
          className="modal-backdrop"
          onClick={() => setViewingUser(null)}
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
              maxWidth: 580,
              width: "100%",
              maxHeight: "90vh",
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
            {/* Modal Header: pinned at top */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
                <img
                  src={viewingUser.photo || "https://randomuser.me/api/portraits/men/22.jpg"}
                  alt={viewingUser.name || "User"}
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                    border: "2px solid var(--border)",
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <h3
                    id="view-profile-title"
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {viewingUser.fullName || viewingUser.name}
                  </h3>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--gray)",
                      marginTop: 3,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <FiMail style={{ flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{viewingUser.email}</span>
                  </div>
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      className={`status-pill ${
                        viewingUser.status === "Active" ? "st-completed" : "st-cancelled"
                      }`}
                      style={{ fontSize: 11, padding: "2px 8px" }}
                    >
                      {viewingUser.status || "Active"}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4 }}>
                      <FiMapPin style={{ fontSize: 11 }} /> {viewingUser.city || viewingUser.location || "Kerala"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingUser(null)}
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
                  marginLeft: 10,
                }}
                aria-label="Close profile details"
                title="Close (Esc)"
              >
                <FiX />
              </button>
            </div>

            {/* Modal Body: independently scrollable */}
            <div
              style={{
                overflowY: "auto",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                fontSize: 14,
              }}
            >
              {/* Bio */}
              <div>
                <b style={{ color: "var(--ink)", display: "block", marginBottom: 5, fontSize: 12.5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Bio:
                </b>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text)",
                    background: "var(--bg)",
                    padding: "10px 14px",
                    borderRadius: 10,
                    lineHeight: 1.55,
                    fontSize: 13.5,
                  }}
                >
                  {viewingUser.bio || "No biography provided yet."}
                </p>
              </div>

              {/* Location & Joined Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                <div style={{ background: "var(--bg)", padding: "10px 14px", borderRadius: 10 }}>
                  <b style={{ color: "var(--ink)", display: "block", marginBottom: 3, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Location:
                  </b>
                  <span style={{ color: "var(--text)", display: "flex", alignItems: "center", gap: 5, fontSize: 13.5 }}>
                    <FiMapPin style={{ color: "var(--gray)" }} /> {viewingUser.city || viewingUser.location || "Kerala"}
                  </span>
                </div>
                <div style={{ background: "var(--bg)", padding: "10px 14px", borderRadius: 10 }}>
                  <b style={{ color: "var(--ink)", display: "block", marginBottom: 3, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Member Since:
                  </b>
                  <span style={{ color: "var(--text)", display: "flex", alignItems: "center", gap: 5, fontSize: 13.5 }}>
                    <FiCalendar style={{ color: "var(--gray)" }} />{" "}
                    {viewingUser.joined ||
                      (viewingUser.createdAt
                        ? new Date(viewingUser.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "Member")}
                  </span>
                </div>
              </div>

              {/* Skills Offered (Teaches) */}
              <div>
                <b style={{ color: "var(--ink)", display: "block", marginBottom: 6, fontSize: 12.5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Skills Offered (Teaches) ({(viewingUser.teaches || viewingUser.skillsOffered || []).length}):
                </b>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(viewingUser.teaches || viewingUser.skillsOffered || []).length > 0 ? (
                    (viewingUser.teaches || viewingUser.skillsOffered).map((t) => (
                      <span
                        key={t}
                        className="tag yellow"
                        style={{
                          wordBreak: "break-word",
                          maxWidth: "100%",
                          whiteSpace: "normal"
                        }}
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "var(--gray)", fontSize: 13, fontStyle: "italic" }}>None listed</span>
                  )}
                </div>
              </div>

              {/* Skills Wanted */}
              <div>
                <b style={{ color: "var(--ink)", display: "block", marginBottom: 6, fontSize: 12.5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Skills Wanted (Wants to Learn) ({(viewingUser.wants || viewingUser.skillsWanted || []).length}):
                </b>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(viewingUser.wants || viewingUser.skillsWanted || []).length > 0 ? (
                    (viewingUser.wants || viewingUser.skillsWanted).map((w) => (
                      <span
                        key={w}
                        className="tag"
                        style={{
                          wordBreak: "break-word",
                          maxWidth: "100%",
                          whiteSpace: "normal"
                        }}
                      >
                        {w}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "var(--gray)", fontSize: 13, fontStyle: "italic" }}>None listed</span>
                  )}
                </div>
              </div>

              {/* Stats Bar */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  borderTop: "1px solid var(--border)",
                  paddingTop: 14,
                  marginTop: 2,
                }}
              >
                <div>
                  <span style={{ color: "var(--gray)", fontSize: 11.5, textTransform: "uppercase", fontWeight: 600 }}>
                    Exchanges Completed
                  </span>
                  <div style={{ fontWeight: 800, fontSize: 19, color: "var(--ink)", marginTop: 2 }}>
                    {viewingUser.completed || 0}
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--gray)", fontSize: 11.5, textTransform: "uppercase", fontWeight: 600 }}>
                    Community Rating
                  </span>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 19,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      color: "var(--ink)",
                      marginTop: 2,
                    }}
                  >
                    <FiStar fill="#F7C843" stroke="#111" style={{ fontSize: 17 }} />{" "}
                    {viewingUser.rating || "5.0"}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer: pinned at bottom */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: "14px 24px",
                borderTop: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <button
                type="button"
                className="btn btn-dark btn-sm"
                onClick={() => setViewingUser(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Permanent Deletion Confirmation Modal */}
      {deletingUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="modal-backdrop"
          onClick={() => !isDeleting && setDeletingUser(null)}
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
              maxWidth: 520,
              width: "100%",
              maxHeight: "90vh",
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
            {/* Dialog Header: pinned at top */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 24px",
                borderBottom: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#dc2626" }}>
                <FiAlertTriangle style={{ fontSize: 24, flexShrink: 0 }} />
                <h3 id="delete-dialog-title" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Confirm Permanent Deletion
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setDeletingUser(null)}
                disabled={isDeleting}
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  fontSize: 16,
                  color: "var(--gray)",
                  opacity: isDeleting ? 0.5 : 1,
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
                aria-label="Cancel deletion"
                title="Cancel (Esc)"
              >
                <FiX />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form
              onSubmit={handleConfirmDelete}
              style={{
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                flex: 1,
                padding: 0,
                margin: 0,
              }}
            >
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                {/* User Identity Highlight Box */}
                <div
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <img
                    src={deletingUser.photo || "https://randomuser.me/api/portraits/men/22.jpg"}
                    alt={deletingUser.name || "User"}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                      border: "1px solid var(--border)",
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {deletingUser.fullName || deletingUser.name}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--gray)", display: "flex", alignItems: "center", gap: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <FiMail style={{ flexShrink: 0, fontSize: 12 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{deletingUser.email}</span>
                    </div>
                  </div>
                </div>

                {/* Irreversible Warning Notice */}
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 12,
                    padding: "12px 16px",
                    fontSize: 13,
                    color: "#991b1b",
                    lineHeight: 1.5,
                  }}
                >
                  <b style={{ display: "block", marginBottom: 4 }}>
                    ⚠️ This action is permanent and cannot be undone.
                  </b>
                  Deleting this account will automatically:
                  <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                    <li>Delete user profile and credentials</li>
                    <li>Remove all active skill listings</li>
                    <li>Clean up all session and notification records</li>
                    <li>Cancel active and pending learning agreements</li>
                  </ul>
                </div>

                {/* Mandatory Deletion Reason Field */}
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: 13.5, display: "block", marginBottom: 6, color: "var(--ink)" }}>
                    Mandatory Deletion Reason <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="e.g. Inappropriate community conduct, spam listings, or verified user request"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    required
                    disabled={isDeleting}
                    style={{
                      resize: "vertical",
                      width: "100%",
                      boxSizing: "border-box",
                      fontSize: 13.5,
                      borderRadius: 10,
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons: always visible without scrolling main page */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "flex-end",
                  alignItems: "center",
                  padding: "14px 24px",
                  borderTop: "1px solid var(--border)",
                  background: "var(--surface)",
                  marginTop: "auto",
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setDeletingUser(null)}
                  disabled={isDeleting}
                  style={{ minWidth: 90 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm"
                  style={{
                    background: isDeleting || !deleteReason.trim() ? "#f87171" : "#dc2626",
                    color: "#fff",
                    border: "none",
                    cursor: isDeleting || !deleteReason.trim() ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 600,
                    minWidth: 160,
                    justifyContent: "center",
                  }}
                  disabled={isDeleting || !deleteReason.trim()}
                >
                  <FiTrash2 style={{ fontSize: 14 }} />
                  {isDeleting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
