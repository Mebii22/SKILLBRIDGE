import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  FiSearch,
  FiTrash2,
  FiEye,
  FiX,
  FiList,
  FiMapPin,
  FiMail,
  FiCalendar,
  FiStar,
  FiAlertTriangle,
  FiBookOpen,
  FiAward
} from "react-icons/fi";
import SkillTag from "../../components/SkillTag";
import {
  fetchAdminSkillsAsync,
  removeSkillAsync
} from "../../redux/slices/adminSlice";

// Safe helper to extract a clean skill string from string or object
const getSkillName = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object") {
    if (val.skill) return getSkillName(val.skill);
    return (val.name || val.title || val.label || "").toString().trim();
  }
  return String(val).trim();
};

export default function SkillListings() {
  const listings = useSelector((s) => s.admin.skillListings || []);
  const loading = useSelector((s) => s.admin.loading);
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [viewingSkill, setViewingSkill] = useState(null);
  const [removingSkill, setRemovingSkill] = useState(null);
  const [removeReason, setRemoveReason] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    dispatch(fetchAdminSkillsAsync());
  }, [dispatch]);

  // Lock background scroll and support Escape key when a modal is open
  useEffect(() => {
    const isModalOpen = Boolean(viewingSkill || removingSkill);
    if (isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          if (!isRemoving) {
            setViewingSkill(null);
            setRemovingSkill(null);
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [viewingSkill, removingSkill, isRemoving]);

  const handleConfirmRemove = async (e) => {
    e.preventDefault();
    if (!removingSkill || !removeReason.trim()) return;

    const skillName = getSkillName(removingSkill.skill || removingSkill);
    if (!skillName) return;

    setIsRemoving(true);
    try {
      await dispatch(
        removeSkillAsync({
          id: removingSkill.id || removingSkill._id,
          userId: removingSkill.userId,
          skill: skillName,
          type: removingSkill.type,
          reason: removeReason.trim()
        })
      ).unwrap();

      // Refresh listings from backend to ensure state is in sync with MongoDB
      dispatch(fetchAdminSkillsAsync());

      setActionMsg(`Skill '${skillName}' was removed from ${removingSkill.userName || "user"}'s profile.`);
      setRemovingSkill(null);
      setRemoveReason("");
      setTimeout(() => setActionMsg(""), 4500);
    } catch (err) {
      setActionMsg(`Error: ${err || "Failed to remove skill"}`);
      setTimeout(() => setActionMsg(""), 5000);
    } finally {
      setIsRemoving(false);
    }
  };

  // Filter skills by search query and type (All, Teach, Learn)
  const filtered = listings.filter((item) => {
    if (!item) return false;
    const q = search.trim().toLowerCase();
    const skillName = getSkillName(item.skill).toLowerCase();
    const userName = (item.userName || "").toLowerCase();
    const userEmail = (item.userEmail || "").toLowerCase();
    const userCity = (item.userCity || "").toLowerCase();
    const category = (item.category || "").toLowerCase();

    const matchesSearch =
      !q ||
      skillName.includes(q) ||
      userName.includes(q) ||
      userEmail.includes(q) ||
      userCity.includes(q) ||
      category.includes(q);

    const matchesType =
      typeFilter === "All" ||
      (typeFilter === "Teach" && (item.type === "Teach" || item.type === "teach")) ||
      (typeFilter === "Learn" && (item.type === "Learn" || item.type === "learn"));

    return matchesSearch && matchesType;
  });

  const teachCount = listings.filter((l) => l && (l.type === "Teach" || l.type === "teach")).length;
  const learnCount = listings.filter((l) => l && (l.type === "Learn" || l.type === "learn")).length;

  return (
    <>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1>Skill Management</h1>
          <p>Monitor and manage actual skills added and updated by community members.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-xs"
          onClick={() => dispatch(fetchAdminSkillsAsync())}
          title="Refresh skills"
        >
          ↻ Refresh Skills
        </button>
      </div>

      {actionMsg && (
        <div
          className="dash-panel"
          style={{
            borderLeft: "4px solid #16a34a",
            background: "#f0fdf4",
            marginBottom: 20,
            padding: "12px 18px",
          }}
        >
          <p style={{ color: "#166534", margin: 0, fontSize: 14, fontWeight: 500 }}>
            {actionMsg}
          </p>
        </div>
      )}

      {/* Search and Filters Bar */}
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
              flex: "1 1 260px",
            }}
          >
            <FiSearch style={{ color: "var(--gray)" }} />
            <input
              type="text"
              placeholder="Search by skill, member name, email or city..."
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

          {/* Type Filter Chips: All, Skills I Can Teach, Skills I Want to Learn */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setTypeFilter("All")}
              style={{
                padding: "7px 14px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                border: typeFilter === "All" ? "1px solid var(--black)" : "1px solid var(--border)",
                background: typeFilter === "All" ? "var(--black)" : "var(--surface)",
                color: typeFilter === "All" ? "#fff" : "var(--text)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              All Skills ({listings.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("Teach")}
              style={{
                padding: "7px 14px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                border: typeFilter === "Teach" ? "1px solid #b45309" : "1px solid var(--border)",
                background: typeFilter === "Teach" ? "#fef3c7" : "var(--surface)",
                color: typeFilter === "Teach" ? "#92400e" : "var(--text)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <FiAward style={{ fontSize: 13 }} /> Skills I Can Teach ({teachCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("Learn")}
              style={{
                padding: "7px 14px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                border: typeFilter === "Learn" ? "1px solid #1d4ed8" : "1px solid var(--border)",
                background: typeFilter === "Learn" ? "#dbeafe" : "var(--surface)",
                color: typeFilter === "Learn" ? "#1e40af" : "var(--text)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <FiBookOpen style={{ fontSize: 13 }} /> Skills I Want to Learn ({learnCount})
            </button>
          </div>
        </div>
      </div>

      {/* Skills Table */}
      <div className="dash-panel" style={{ padding: 18 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Skill</th>
                <th>Type</th>
                <th>Member</th>
                <th>Email</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const skillStr = getSkillName(item.skill);
                const sid = item.id || `${item.userId}_${item.type}_${skillStr}`;
                const isTeach = item.type === "Teach" || item.type === "teach";

                return (
                  <tr key={sid}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{skillStr}</div>
                        <div style={{ marginTop: 4 }}>
                          <SkillTag yellow={isTeach}>{item.category || "General"}</SkillTag>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 700,
                          background: isTeach ? "#fef3c7" : "#dbeafe",
                          color: isTeach ? "#92400e" : "#1e40af",
                          border: isTeach ? "1px solid #fde68a" : "1px solid #bfdbfe"
                        }}
                      >
                        {isTeach ? <FiAward /> : <FiBookOpen />}
                        {isTeach ? "Skills I Can Teach" : "Skills I Want to Learn"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img
                          src={item.userPhoto || "https://randomuser.me/api/portraits/men/22.jpg"}
                          alt={item.userName || "User"}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "1px solid var(--border)",
                            flexShrink: 0
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{item.userName}</div>
                          {item.userCity && (
                            <div style={{ fontSize: 12, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4 }}>
                              <FiMapPin style={{ fontSize: 11 }} /> {item.userCity}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="t-mail" style={{ fontSize: 13 }}>
                      {item.userEmail}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                        <button
                          type="button"
                          className="btn-xs"
                          style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}
                          onClick={() => setViewingSkill(item)}
                          title="View member skill details"
                        >
                          <FiEye /> View
                        </button>

                        <button
                          type="button"
                          className="btn-xs danger"
                          onClick={() => {
                            setRemovingSkill(item);
                            setRemoveReason("");
                          }}
                          title="Remove this skill from user's profile"
                        >
                          <FiTrash2 /> Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "36px 16px", color: "var(--gray)" }}>
                    <FiList style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: 14 }}>
                      {search || typeFilter !== "All"
                        ? "No skills found matching your search or filter."
                        : "No community skills have been submitted yet."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: View Skill Details Modal */}
      {viewingSkill && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-skill-title"
          className="modal-backdrop"
          onClick={() => setViewingSkill(null)}
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
            {/* Header: pinned at top */}
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
              <div>
                <h3 id="view-skill-title" style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
                  Skill & Member Profile
                </h3>
                <span style={{ fontSize: 13, color: "var(--gray)" }}>
                  Current saved information from user profile
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingSkill(null)}
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

            {/* Scrollable Body */}
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
              {/* Target Skill Highlight Box */}
              <div
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--gray)" }}>
                    Selected Skill
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "var(--ink)" }}>
                    {getSkillName(viewingSkill.skill)}
                  </div>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    background: viewingSkill.type === "Teach" ? "#fef3c7" : "#dbeafe",
                    color: viewingSkill.type === "Teach" ? "#92400e" : "#1e40af",
                    border: viewingSkill.type === "Teach" ? "1px solid #fde68a" : "1px solid #bfdbfe"
                  }}
                >
                  {viewingSkill.type === "Teach" ? <FiAward /> : <FiBookOpen />}
                  {viewingSkill.type === "Teach" ? "Skills I Can Teach" : "Skills I Want to Learn"}
                </span>
              </div>

              {/* Owner Profile Information */}
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "16px",
                  display: "flex",
                  gap: 14,
                  alignItems: "center"
                }}
              >
                <img
                  src={viewingSkill.userPhoto || "https://randomuser.me/api/portraits/men/22.jpg"}
                  alt={viewingSkill.userName || "User"}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid var(--border)",
                    flexShrink: 0
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>
                    {viewingSkill.userName}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--gray)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <FiMail style={{ flexShrink: 0 }} /> {viewingSkill.userEmail}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-sec)", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <FiMapPin style={{ flexShrink: 0 }} /> {viewingSkill.userCity || "Kerala"} • Status: <b>{viewingSkill.userStatus || "Active"}</b>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {viewingSkill.userBio && (
                <div>
                  <b style={{ color: "var(--ink)", display: "block", marginBottom: 4, fontSize: 12.5, textTransform: "uppercase" }}>
                    Bio:
                  </b>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text)",
                      background: "var(--bg)",
                      padding: "10px 14px",
                      borderRadius: 10,
                      lineHeight: 1.5,
                      fontSize: 13.5
                    }}
                  >
                    {viewingSkill.userBio}
                  </p>
                </div>
              )}

              {/* All Skills Offered by User */}
              <div>
                <b style={{ color: "var(--ink)", display: "block", marginBottom: 6, fontSize: 12.5, textTransform: "uppercase" }}>
                  All Skills Offered (Teaches):
                </b>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(viewingSkill.userTeaches || []).length > 0 ? (
                    viewingSkill.userTeaches.map((t) => {
                      const tStr = getSkillName(t);
                      const isMatch = tStr.toLowerCase() === getSkillName(viewingSkill.skill).toLowerCase();
                      return (
                        <SkillTag key={tStr} yellow={isMatch}>
                          {tStr} {isMatch && viewingSkill.type === "Teach" ? "★" : ""}
                        </SkillTag>
                      );
                    })
                  ) : (
                    <span style={{ color: "var(--gray)", fontSize: 13 }}>None listed</span>
                  )}
                </div>
              </div>

              {/* All Skills Wanted by User */}
              <div>
                <b style={{ color: "var(--ink)", display: "block", marginBottom: 6, fontSize: 12.5, textTransform: "uppercase" }}>
                  All Skills Wanted (Wants to Learn):
                </b>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(viewingSkill.userWants || []).length > 0 ? (
                    viewingSkill.userWants.map((w) => {
                      const wStr = getSkillName(w);
                      const isMatch = wStr.toLowerCase() === getSkillName(viewingSkill.skill).toLowerCase();
                      return (
                        <SkillTag key={wStr}>
                          {wStr} {isMatch && viewingSkill.type === "Learn" ? "★" : ""}
                        </SkillTag>
                      );
                    })
                  ) : (
                    <span style={{ color: "var(--gray)", fontSize: 13 }}>None listed</span>
                  )}
                </div>
              </div>

              {/* User Rating & Completed Exchanges */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  borderTop: "1px solid var(--border)",
                  paddingTop: 14,
                  marginTop: 2
                }}
              >
                <div>
                  <span style={{ color: "var(--gray)", fontSize: 11.5, textTransform: "uppercase", fontWeight: 600 }}>
                    Exchanges Completed
                  </span>
                  <div style={{ fontWeight: 800, fontSize: 19, color: "var(--ink)", marginTop: 2 }}>
                    {viewingSkill.userCompleted || 0}
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--gray)", fontSize: 11.5, textTransform: "uppercase", fontWeight: 600 }}>
                    Community Rating
                  </span>
                  <div style={{ fontWeight: 800, fontSize: 19, display: "flex", alignItems: "center", gap: 5, color: "var(--ink)", marginTop: 2 }}>
                    <FiStar fill="#F7C843" stroke="#111" style={{ fontSize: 17 }} /> {viewingSkill.userRating > 0 ? Number(viewingSkill.userRating).toFixed(1) : "Unrated"}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer: pinned at bottom */}
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
                onClick={() => setViewingSkill(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Remove Skill Confirmation Modal */}
      {removingSkill && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-skill-title"
          className="modal-backdrop"
          onClick={() => !isRemoving && setRemovingSkill(null)}
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
            {/* Dialog Header */}
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
                <h3 id="remove-skill-title" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Remove Inappropriate Skill
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isRemoving && setRemovingSkill(null)}
                disabled={isRemoving}
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isRemoving ? "not-allowed" : "pointer",
                  fontSize: 16,
                  color: "var(--gray)",
                  opacity: isRemoving ? 0.5 : 1,
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
                aria-label="Cancel removal"
                title="Cancel (Esc)"
              >
                <FiX />
              </button>
            </div>

            {/* Form & Body */}
            <form
              onSubmit={handleConfirmRemove}
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
                {/* Skill & Target Owner Box */}
                <div
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "var(--ink)" }}>
                      {getSkillName(removingSkill.skill)}
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 10,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: removingSkill.type === "Teach" ? "#fef3c7" : "#dbeafe",
                        color: removingSkill.type === "Teach" ? "#92400e" : "#1e40af",
                        border: removingSkill.type === "Teach" ? "1px solid #fde68a" : "1px solid #bfdbfe"
                      }}
                    >
                      {removingSkill.type === "Teach" ? "Skills I Can Teach" : "Skills I Want to Learn"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    <img
                      src={removingSkill.userPhoto || "https://randomuser.me/api/portraits/men/22.jpg"}
                      alt={removingSkill.userName || "User"}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "1px solid var(--border)",
                        flexShrink: 0
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>
                        {removingSkill.userName}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--gray)", display: "flex", alignItems: "center", gap: 4 }}>
                        <FiMail style={{ flexShrink: 0 }} /> {removingSkill.userEmail}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Safe Removal Notice */}
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
                  <b style={{ display: "block", marginBottom: 3 }}>
                    Notice:
                  </b>
                  This action will remove the skill <b>'{getSkillName(removingSkill.skill)}'</b> from <b>{removingSkill.userName}</b>'s profile.
                  <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                    <li>The user account will <b>not</b> be deleted.</li>
                    <li>The user's other skills will remain completely untouched.</li>
                    <li>Other users who have this skill will not be affected.</li>
                  </ul>
                </div>

                {/* Mandatory Removal Reason Field */}
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: 13.5, display: "block", marginBottom: 6, color: "var(--ink)" }}>
                    Mandatory Removal Reason <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="e.g. Inappropriate content, spam entry, or violated skill guidelines"
                    value={removeReason}
                    onChange={(e) => setRemoveReason(e.target.value)}
                    required
                    disabled={isRemoving}
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

              {/* Action Buttons */}
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
                  onClick={() => setRemovingSkill(null)}
                  disabled={isRemoving}
                  style={{ minWidth: 90 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm"
                  style={{
                    background: isRemoving || !removeReason.trim() ? "#f87171" : "#dc2626",
                    color: "#fff",
                    border: "none",
                    cursor: isRemoving || !removeReason.trim() ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 600,
                    minWidth: 150,
                    justifyContent: "center",
                  }}
                  disabled={isRemoving || !removeReason.trim()}
                >
                  <FiTrash2 style={{ fontSize: 14 }} />
                  {isRemoving ? "Removing..." : "Remove Skill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
