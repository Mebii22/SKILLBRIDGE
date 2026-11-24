import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiPlus,
  FiArrowLeft,
  FiGlobe,
  FiClock,
  FiMapPin,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiCalendar,
  FiBookOpen,
  FiAward,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";
import { CATEGORIES } from "../../data/dummyData";
import SkillTag from "../../components/SkillTag";
import EmptyState from "../../components/EmptyState";
import { fetchUsersAsync } from "../../redux/slices/userSlice";
import {
  fetchMySkillsAsync,
  createSkillListingAsync,
  updateSkillListingAsync,
  deleteSkillListingAsync,
} from "../../redux/slices/skillSlice";
import { addNotification } from "../../redux/slices/notificationSlice";

const LEVELS = [
  { value: "Beginner", label: "Beginner Friendly" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced / Expert" },
];

const MODES = [
  { id: "Online", label: "🌐 Online" },
  { id: "Offline", label: "📍 Offline" },
  { id: "Both", label: "🔄 Both (Online & Offline)" },
];

const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
};

export default function ShareSkill() {
  const currentUser = useSelector((s) => s.user.currentUser);
  const { myListings, loading, submitting } = useSelector((s) => s.skills);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("form"); // "form" | "my-listings"
  const [editingListing, setEditingListing] = useState(null);
  const [viewingListing, setViewingListing] = useState(null);
  const [deletingListing, setDeletingListing] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "Technology",
    level: "Intermediate",
    mode: currentUser?.mode || "Both",
    location: currentUser?.city ? `${currentUser.city}, Kerala` : currentUser?.location || "Kochi, Kerala",
    availability: currentUser?.availability || "Weekends 10:00 AM – 2:00 PM",
    description: "",
    experience: "",
    wantSkill: "",
    wantCategory: "Photography",
    wantLevel: "Beginner",
    name: currentUser?.fullName || currentUser?.name || "",
    bio: currentUser?.bio || "",
  });

  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [globalError, setGlobalError] = useState("");

  // Load user's listings on mount
  useEffect(() => {
    dispatch(fetchMySkillsAsync());
  }, [dispatch]);

  // Sync user defaults when currentUser updates and not in edit mode
  useEffect(() => {
    if (currentUser && !editingListing) {
      setForm((prev) => ({
        ...prev,
        name: currentUser.fullName || currentUser.name || prev.name,
        location: prev.location || (currentUser.city ? `${currentUser.city}, Kerala` : currentUser.location || ""),
        bio: prev.bio || currentUser.bio || "",
        mode: prev.mode || currentUser.mode || "Both",
        availability: prev.availability || currentUser.availability || "Weekends 10:00 AM – 2:00 PM",
      }));
    }
  }, [currentUser, editingListing]);

  // Populate form when editing a listing
  const handleStartEdit = (listing) => {
    setEditingListing(listing);
    setForm({
      title: listing.title || listing.skill || "",
      category: listing.category || "Technology",
      level: listing.level || "Intermediate",
      mode: listing.mode || "Both",
      location: listing.location || currentUser?.location || "",
      availability: listing.availability || currentUser?.availability || "",
      description: listing.description || "",
      experience: listing.experience || "",
      wantSkill: "",
      wantCategory: "Photography",
      wantLevel: "Beginner",
      name: currentUser?.fullName || currentUser?.name || "",
      bio: currentUser?.bio || "",
    });
    setErrors({});
    setGlobalError("");
    setSuccessMsg("");
    setActiveTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingListing(null);
    setForm({
      title: "",
      category: "Technology",
      level: "Intermediate",
      mode: currentUser?.mode || "Both",
      location: currentUser?.city ? `${currentUser.city}, Kerala` : currentUser?.location || "Kochi, Kerala",
      availability: currentUser?.availability || "Weekends 10:00 AM – 2:00 PM",
      description: "",
      experience: "",
      wantSkill: "",
      wantCategory: "Photography",
      wantLevel: "Beginner",
      name: currentUser?.fullName || currentUser?.name || "",
      bio: currentUser?.bio || "",
    });
    setErrors({});
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (globalError) setGlobalError("");
  };

  // Form Validation
  const validateForm = () => {
    const errs = {};
    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      errs.title = "Skill title is required.";
    } else if (trimmedTitle.length < 2) {
      errs.title = "Skill title must be at least 2 characters.";
    } else if (trimmedTitle.length > 70) {
      errs.title = "Skill title cannot exceed 70 characters.";
    }

    if (!form.category) {
      errs.category = "Please select a category.";
    }

    const trimmedDesc = form.description.trim();
    if (!trimmedDesc) {
      errs.description = "A detailed description is required.";
    } else if (trimmedDesc.length < 10) {
      errs.description = "Description must be at least 10 characters long.";
    } else if (trimmedDesc.length > 1000) {
      errs.description = "Description cannot exceed 1000 characters.";
    }

    const trimmedAvail = form.availability.trim();
    if (!trimmedAvail) {
      errs.availability = "Please share your weekly availability.";
    }

    if ((form.mode === "Offline" || form.mode === "Both") && !form.location.trim()) {
      errs.location = "Location is required for offline / in-person exchanges.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setGlobalError("");
    setSuccessMsg("");

    if (!validateForm()) return;

    const payload = {
      title: form.title.trim(),
      skill: form.title.trim(),
      category: form.category,
      level: form.level,
      mode: form.mode,
      location: form.location.trim(),
      availability: form.availability.trim(),
      description: form.description.trim(),
      experience: form.experience.trim(),
      wantSkill: form.wantSkill.trim(),
      city: form.location.split(",")[0].trim(),
    };

    try {
      if (editingListing) {
        // UPDATE EXISTING LISTING
        const res = await dispatch(
          updateSkillListingAsync({
            id: editingListing.id || editingListing._id,
            data: payload,
          })
        );

        if (updateSkillListingAsync.fulfilled.match(res)) {
          dispatch(fetchUsersAsync());
          dispatch(
            addNotification({
              type: "session",
              title: "Skill listing updated",
              text: `Your listing for "${form.title.trim()}" has been updated successfully.`,
            })
          );
          setSuccessMsg(`Skill listing "${form.title.trim()}" updated successfully!`);
          setEditingListing(null);
          handleCancelEdit();
          setActiveTab("my-listings");
        } else {
          setGlobalError(res.payload || "Failed to update skill listing. Please check your input.");
        }
      } else {
        // CREATE NEW LISTING
        const res = await dispatch(createSkillListingAsync(payload));

        if (createSkillListingAsync.fulfilled.match(res)) {
          dispatch(fetchUsersAsync());
          dispatch(
            addNotification({
              type: "session",
              title: "Skill listing published!",
              text: `Your listing for "${form.title.trim()}" is now live and discoverable.`,
            })
          );
          setSuccessMsg(`Skill listing "${form.title.trim()}" published successfully!`);
          handleCancelEdit();
          setActiveTab("my-listings");
        } else {
          setGlobalError(res.payload || "Failed to publish skill listing. Please check your input.");
        }
      }
    } catch {
      setGlobalError("An unexpected error occurred. Please check your connection.");
    }
  };

  // Delete Listing Confirmation
  const handleConfirmDelete = async () => {
    if (!deletingListing) return;
    setDeleteLoading(true);
    try {
      const listingId = deletingListing.id || deletingListing._id;
      const listingTitle = deletingListing.title || deletingListing.skill;

      const res = await dispatch(deleteSkillListingAsync(listingId));
      if (deleteSkillListingAsync.fulfilled.match(res)) {
        dispatch(fetchUsersAsync());
        dispatch(
          addNotification({
            type: "session",
            title: "Skill listing deleted",
            text: `Your listing for "${listingTitle}" was removed.`,
          })
        );
        setSuccessMsg(`Skill listing "${listingTitle}" was deleted successfully.`);
        setDeletingListing(null);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setGlobalError(res.payload || "Failed to delete listing.");
      }
    } catch {
      setGlobalError("An error occurred while deleting the listing.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="panel-link"
          style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <FiArrowLeft /> Back
        </button>
      </div>

      <div className="page-head">
        <h1>Share a Skill</h1>
        <p>List what you can teach, discover learning opportunities in return, and manage your published skill listings.</p>
      </div>

      {/* FEEDBACK ALERTS */}
      {successMsg && (
        <div className="profile-alert-box success">
          <FiCheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {globalError && (
        <div className="profile-alert-box error">
          <FiAlertCircle size={18} />
          <span>{globalError}</span>
        </div>
      )}

      {/* TABS: CREATE/EDIT vs MY LISTINGS */}
      <div className="tabs">
        <button
          type="button"
          className={`tab ${activeTab === "form" ? "active" : ""}`}
          onClick={() => setActiveTab("form")}
        >
          {editingListing ? "✏️ Edit Listing" : "➕ Share a Skill"}
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "my-listings" ? "active" : ""}`}
          onClick={() => setActiveTab("my-listings")}
        >
          📋 My Published Listings ({myListings.length})
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: SHARE / EDIT SKILL FORM */}
      {/* ============================================================== */}
      {activeTab === "form" && (
        <>
          {editingListing && (
            <div className="profile-alert-box info" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FiEdit2 size={16} />
                <span>
                  Currently editing listing: <b>{editingListing.title || editingListing.skill}</b>
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn btn-outline btn-sm"
                style={{ padding: "4px 12px", fontSize: 12 }}
              >
                Cancel Edit
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Step 1: Skill Details */}
            <div className="dash-panel" style={{ marginBottom: 24 }}>
              <div className="panel-title">
                <h3>1. Skill You Are Offering</h3>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--gray)", marginBottom: 18 }}>
                Provide accurate details about what you will teach so matching partners understand what to expect.
              </p>

              <div className="form-grid">
                <div className="field">
                  <label>Skill Title *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Modern React & Redux Toolkit, Acoustic Guitar, Portrait Photography"
                    value={form.title}
                    onChange={setField("title")}
                  />
                  {errors.title && <div className="error-text">{errors.title}</div>}
                </div>

                <div className="field">
                  <label>Skill Category *</label>
                  <select className="input" value={form.category} onChange={setField("category")}>
                    {CATEGORIES.filter((c) => c !== "All Skills").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.category && <div className="error-text">{errors.category}</div>}
                </div>

                <div className="field">
                  <label>Skill Level *</label>
                  <select className="input" value={form.level} onChange={setField("level")}>
                    {LEVELS.map((lvl) => (
                      <option key={lvl.value} value={lvl.value}>
                        {lvl.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label><FiClock /> Your Availability *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Weekends 10 AM – 2 PM or Weekdays after 6 PM"
                    value={form.availability}
                    onChange={setField("availability")}
                  />
                  {errors.availability && <div className="error-text">{errors.availability}</div>}
                </div>

                <div className="field full">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label>Detailed Description *</label>
                    <span style={{ fontSize: 12, color: "var(--gray)" }}>
                      {form.description.length} / 1000
                    </span>
                  </div>
                  <textarea
                    className="input"
                    rows={4}
                    maxLength={1000}
                    placeholder="Describe what learners will gain from this exchange, prerequisites, hands-on topics covered, and your teaching approach..."
                    value={form.description}
                    onChange={setField("description")}
                  />
                  {errors.description && <div className="error-text">{errors.description}</div>}
                </div>

                <div className="field full">
                  <label>Your Experience / Background (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. 4+ years building production web apps; mentored 20+ junior engineers"
                    value={form.experience}
                    onChange={setField("experience")}
                  />
                  <span style={{ fontSize: 12, color: "var(--gray)", marginTop: 4, display: "block" }}>
                    Highlighting relevant projects, certifications, or years of practice boosts peer trust.
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2: Exchange & Location Preferences */}
            <div className="dash-panel" style={{ marginBottom: 24 }}>
              <div className="panel-title">
                <h3>2. Learning Mode & Location</h3>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label><FiGlobe /> Exchange Mode *</label>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    {MODES.map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        className={`chip ${form.mode === m.id ? "active" : ""}`}
                        style={{ flex: 1, minWidth: 95, padding: "8px 12px", justifyContent: "center" }}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, mode: m.id }));
                          if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label>
                    <FiMapPin /> Offline Learning Location {form.mode !== "Online" ? "*" : "(Optional)"}
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Kochi, Kerala or Thrissur, Kerala"
                    value={form.location}
                    onChange={setField("location")}
                  />
                  {errors.location && <div className="error-text">{errors.location}</div>}
                  <span style={{ fontSize: 12, color: "var(--gray)", marginTop: 4, display: "block" }}>
                    {form.mode === "Online"
                      ? "Optional for purely online sessions."
                      : "Required for offline or hybrid meetups (library, co-working, or cafe)."}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3: Skill You Wish to Learn in Return */}
            <div className="dash-panel" style={{ marginBottom: 24 }}>
              <div className="panel-title">
                <h3>3. Desired Skill in Return (Optional)</h3>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--gray)", marginBottom: 18 }}>
                Share what skills you are eager to learn in exchange. This helps the matching algorithm find 100% mutual partners.
              </p>

              <div className="form-grid">
                <div className="field">
                  <label>Skill You Want to Learn</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Spoken Spanish, UI/UX Design, Python Data Science"
                    value={form.wantSkill}
                    onChange={setField("wantSkill")}
                  />
                </div>

                <div className="field">
                  <label>Desired Category</label>
                  <select className="input" value={form.wantCategory} onChange={setField("wantCategory")}>
                    {CATEGORIES.filter((c) => c !== "All Skills").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit & Reset Buttons */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button type="submit" className="btn btn-dark" disabled={submitting}>
                <FiCheck /> {submitting ? (editingListing ? "Updating..." : "Publishing...") : (editingListing ? "Update Skill Listing" : "Publish Skill Listing")}
              </button>
              {editingListing ? (
                <button type="button" className="btn btn-outline" onClick={handleCancelEdit}>
                  Cancel Edit
                </button>
              ) : (
                <button type="button" className="btn btn-outline" onClick={() => navigate("/discover")}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </>
      )}

      {/* ============================================================== */}
      {/* TAB 2: MY PUBLISHED SKILL LISTINGS */}
      {/* ============================================================== */}
      {activeTab === "my-listings" && (
        <>
          {loading && myListings.length === 0 ? (
            <div className="dash-panel" style={{ textAlign: "center", padding: "40px 20px" }}>
              <p style={{ color: "var(--gray)" }}>Loading your published listings...</p>
            </div>
          ) : myListings.length === 0 ? (
            <EmptyState
              doodle="search"
              title="No skill listings published yet"
              text="Publish the skills you are passionate about teaching to start connecting with eager learners on SkillBridge."
              actionLabel="Share a Skill Now"
              onAction={() => setActiveTab("form")}
            />
          ) : (
            <div className="skill-listings-grid">
              {myListings.map((listing) => {
                const title = listing.title || listing.skill;
                const level = listing.level || "Intermediate";
                const mode = listing.mode || "Both";

                return (
                  <div key={listing.id || listing._id} className="skill-listing-card">
                    <div>
                      {/* Header with Title & Status */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div>
                          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>{title}</h3>
                          <SkillTag yellow>{listing.category || "Technology"}</SkillTag>
                        </div>
                        <span className="status-badge-approved">
                          ● {listing.status === "approved" ? "Active" : listing.status}
                        </span>
                      </div>

                      {/* Meta Badges */}
                      <div className="skill-meta-row">
                        <span className="skill-meta-chip">
                          <FiBookOpen size={12} /> {level}
                        </span>
                        <span className="skill-meta-chip">
                          <FiGlobe size={12} /> {mode}
                        </span>
                        {listing.location && (
                          <span className="skill-meta-chip">
                            <FiMapPin size={12} /> {listing.location}
                          </span>
                        )}
                      </div>

                      {/* Description excerpt */}
                      <p
                        style={{
                          fontSize: 13.5,
                          color: "var(--gray)",
                          lineHeight: 1.5,
                          margin: "10px 0 14px",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {listing.description || "No description provided."}
                      </p>

                      {listing.experience && (
                        <div style={{ fontSize: 12.5, color: "var(--ink)", marginBottom: 12, background: "var(--cream)", padding: "6px 10px", borderRadius: 8 }}>
                          <span style={{ fontWeight: 700 }}>Experience:</span> {listing.experience}
                        </div>
                      )}

                      {/* Availability & Dates */}
                      <div style={{ fontSize: 12, color: "var(--gray)", display: "flex", flexDirection: "column", gap: 4, borderTop: "1px dashed var(--border)", paddingTop: 10 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <FiClock /> {listing.availability || "Flexible availability"}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <FiCalendar /> Listed: {formatDate(listing.createdAt)}
                          {listing.updatedAt && listing.updatedAt !== listing.createdAt && ` (Updated ${formatDate(listing.updatedAt)})`}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8, marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 5 }}
                        onClick={() => setViewingListing(listing)}
                      >
                        <FiEye /> View
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 5 }}
                        onClick={() => handleStartEdit(listing)}
                      >
                        <FiEdit2 /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ justifyContent: "center", color: "#b91c1c", borderColor: "#fca5a5" }}
                        onClick={() => setDeletingListing(listing)}
                        title="Delete listing"
                        aria-label="Delete listing"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* VIEW LISTING DETAILS MODAL */}
      {/* ============================================================== */}
      {viewingListing && (
        <div className="modal-overlay" onClick={() => setViewingListing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-head">
              <h3>{viewingListing.title || viewingListing.skill}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setViewingListing(null)}
                aria-label="Close modal"
              >
                <FiX />
              </button>
            </div>
            <p className="modal-sub">Published Skill Listing Details</p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              <SkillTag yellow>{viewingListing.category || "Technology"}</SkillTag>
              <span className="status-badge-approved">● Approved & Discoverable</span>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div className="modal-detail-row">
                <span className="modal-detail-label">Skill Level</span>
                <span className="modal-detail-val">{viewingListing.level || "Intermediate"}</span>
              </div>
              <div className="modal-detail-row">
                <span className="modal-detail-label">Exchange Mode</span>
                <span className="modal-detail-val">{viewingListing.mode || "Both"}</span>
              </div>
              <div className="modal-detail-row">
                <span className="modal-detail-label">Location</span>
                <span className="modal-detail-val">{viewingListing.location || "Online"}</span>
              </div>
              <div className="modal-detail-row">
                <span className="modal-detail-label">Availability</span>
                <span className="modal-detail-val">{viewingListing.availability || "Flexible"}</span>
              </div>
              {viewingListing.experience && (
                <div className="modal-detail-row">
                  <span className="modal-detail-label">Experience</span>
                  <span className="modal-detail-val">{viewingListing.experience}</span>
                </div>
              )}
              <div className="modal-detail-row">
                <span className="modal-detail-label">Created Date</span>
                <span className="modal-detail-val">{formatDate(viewingListing.createdAt)}</span>
              </div>
              <div className="modal-detail-row">
                <span className="modal-detail-label">Last Updated</span>
                <span className="modal-detail-val">{formatDate(viewingListing.updatedAt || viewingListing.createdAt)}</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Description</h4>
              <p style={{ fontSize: 14, color: "var(--gray)", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {viewingListing.description || "No description provided."}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn btn-dark btn-sm"
                onClick={() => {
                  const target = viewingListing;
                  setViewingListing(null);
                  handleStartEdit(target);
                }}
              >
                <FiEdit2 /> Edit This Listing
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setViewingListing(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================================== */}
      {deletingListing && (
        <div className="modal-overlay" onClick={() => !deleteLoading && setDeletingListing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-head">
              <h3>Delete Skill Listing</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => !deleteLoading && setDeletingListing(null)}
                aria-label="Close modal"
              >
                <FiX />
              </button>
            </div>
            <p className="modal-sub">
              Are you sure you want to delete the listing for <b>"{deletingListing.title || deletingListing.skill}"</b>?
            </p>

            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 13,
                color: "#991b1b",
                marginBottom: 20,
              }}
            >
              This will remove the published listing from Discover. Other unrelated profile skills will not be affected.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={deleteLoading}
                onClick={() => setDeletingListing(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-dark btn-sm"
                style={{ background: "#b91c1c", borderColor: "#b91c1c", color: "#fff" }}
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
              >
                {deleteLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
