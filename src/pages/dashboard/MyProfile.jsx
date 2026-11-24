import { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiCheck,
  FiCamera,
  FiUpload,
  FiInstagram,
  FiTwitter,
  FiLinkedin,
  FiGithub,
  FiMapPin,
  FiStar,
  FiMail,
  FiPlus,
  FiX,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiAward,
} from "react-icons/fi";
import SkillTag from "../../components/SkillTag";
import { updateUser, updateUserAsync, fetchMeAsync } from "../../redux/slices/userSlice";
import { fetchNotificationsAsync } from "../../redux/slices/notificationSlice";
import { getSocialUrl, isSafeSocialInput } from "../../utils/socials";

const POPULAR_TEACH_SUGGESTIONS = [
  "JavaScript",
  "React",
  "Python",
  "UI/UX Design",
  "Web Development",
  "Photography",
  "Public Speaking",
  "Guitar",
];

const POPULAR_WANT_SUGGESTIONS = [
  "Node.js",
  "Data Science",
  "Spanish",
  "Machine Learning",
  "Digital Marketing",
  "Video Editing",
  "Piano",
  "TypeScript",
];

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80";

export default function MyProfile() {
  const user = useSelector((s) => s.user.currentUser);
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchMeAsync());
  }, [dispatch]);

  const [form, setForm] = useState({
    fullName: "",
    name: "",
    location: "",
    city: "",
    bio: "",
    photo: "",
    mode: "Both",
    availability: "Weekends & weekday evenings",
    teaches: [],
    wants: [],
    instagram: "",
    twitter: "",
    linkedin: "",
    github: "",
  });

  const [teachInput, setTeachInput] = useState("");
  const [wantInput, setWantInput] = useState("");
  const [teachError, setTeachError] = useState("");
  const [wantError, setWantError] = useState("");

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [imgError, setImgError] = useState("");

  // Populate form when user data loads or updates
  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || user.name || "",
        name: user.name || "",
        location: user.location || (user.city ? `${user.city}, Kerala` : "Kochi, Kerala"),
        city: user.city || (user.location ? user.location.split(",")[0].trim() : "Kochi"),
        bio: user.bio || "",
        photo: user.photo || "",
        mode: user.mode || "Both",
        availability: user.availability || "Weekends & weekday evenings",
        teaches: Array.isArray(user.teaches) ? [...user.teaches] : [],
        wants: Array.isArray(user.wants) ? [...user.wants] : [],
        instagram: user.socials?.instagram || "",
        twitter: user.socials?.twitter || "",
        linkedin: user.socials?.linkedin || "",
        github: user.socials?.github || "",
      });
    }
  }, [user]);

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (errorMsg) setErrorMsg("");
  };

  // Profile Completeness calculation
  const completeness = useMemo(() => {
    let score = 0;
    const missing = [];

    // Full name (10%)
    if (form.fullName && form.fullName.trim().length >= 2) {
      score += 10;
    } else {
      missing.push("full name");
    }

    // Profile photo (15%)
    if (form.photo && form.photo.trim().length > 0) {
      score += 15;
    } else {
      missing.push("profile photo");
    }

    // Bio (15%)
    if (form.bio && form.bio.trim().length >= 10) {
      score += 15;
    } else {
      missing.push("bio description");
    }

    // City / Location (10%)
    if ((form.city && form.city.trim().length > 0) || (form.location && form.location.trim().length > 0)) {
      score += 10;
    } else {
      missing.push("location");
    }

    // Skills I Teach (15%)
    if (form.teaches && form.teaches.length > 0) {
      score += 15;
    } else {
      missing.push("skills you offer");
    }

    // Skills I Want (15%)
    if (form.wants && form.wants.length > 0) {
      score += 15;
    } else {
      missing.push("skills you want to learn");
    }

    // Social Links (10%)
    if (
      (form.instagram && form.instagram.trim()) ||
      (form.twitter && form.twitter.trim()) ||
      (form.linkedin && form.linkedin.trim()) ||
      (form.github && form.github.trim())
    ) {
      score += 10;
    } else {
      missing.push("at least one social link");
    }

    // Availability / Mode (10%)
    if (form.mode && form.availability && form.availability.trim().length > 0) {
      score += 10;
    } else {
      missing.push("learning availability");
    }

    let tip = "";
    if (score === 100) {
      tip = "Awesome! Your profile is 100% complete and stands out to other learners.";
    } else if (missing.length > 0) {
      tip = `Add ${missing[0]} to boost your match visibility!`;
    }

    return { score, tip };
  }, [form]);

  // Image Upload Handler
  const handleImageFileChange = (e) => {
    setImgError("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    const validMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setImgError("Supported formats: JPG, JPEG, PNG, or WebP.");
      return;
    }

    // Validate file size: max 2MB (2 * 1024 * 1024 bytes)
    if (file.size > 2 * 1024 * 1024) {
      setImgError("Image size exceeds 2MB limit. Please choose a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, photo: reader.result }));
      }
    };
    reader.onerror = () => {
      setImgError("Failed to read the image file. Please try another.");
    };
    reader.readAsDataURL(file);
  };

  // Add / Remove Skills I Teach
  const handleAddTeach = (skillToAdd) => {
    const s = (skillToAdd || teachInput).trim();
    setTeachError("");
    if (!s) return;

    if (s.length > 50) {
      setTeachError("Skill name cannot exceed 50 characters.");
      return;
    }

    // Case-insensitive duplicate check
    const isDuplicate = form.teaches.some((existing) => existing.toLowerCase() === s.toLowerCase());
    if (isDuplicate) {
      setTeachError(`"${s}" is already in your Skills Offered list.`);
      return;
    }

    if (form.teaches.length >= 30) {
      setTeachError("You have reached the limit of 30 skills.");
      return;
    }

    setForm((prev) => ({ ...prev, teaches: [...prev.teaches, s] }));
    setTeachInput("");
  };

  const handleRemoveTeach = (indexToRemove) => {
    setTeachError("");
    setForm((prev) => ({
      ...prev,
      teaches: prev.teaches.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Add / Remove Skills I Want to Learn
  const handleAddWant = (skillToAdd) => {
    const s = (skillToAdd || wantInput).trim();
    setWantError("");
    if (!s) return;

    if (s.length > 50) {
      setWantError("Skill name cannot exceed 50 characters.");
      return;
    }

    // Case-insensitive duplicate check
    const isDuplicate = form.wants.some((existing) => existing.toLowerCase() === s.toLowerCase());
    if (isDuplicate) {
      setWantError(`"${s}" is already in your Skills Wanted list.`);
      return;
    }

    if (form.wants.length >= 30) {
      setWantError("You have reached the limit of 30 skills.");
      return;
    }

    setForm((prev) => ({ ...prev, wants: [...prev.wants, s] }));
    setWantInput("");
  };

  const handleRemoveWant = (indexToRemove) => {
    setWantError("");
    setForm((prev) => ({
      ...prev,
      wants: prev.wants.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Reset form to current saved database user
  const handleResetForm = () => {
    if (user) {
      setForm({
        fullName: user.fullName || user.name || "",
        name: user.name || "",
        location: user.location || (user.city ? `${user.city}, Kerala` : "Kochi, Kerala"),
        city: user.city || (user.location ? user.location.split(",")[0].trim() : "Kochi"),
        bio: user.bio || "",
        photo: user.photo || "",
        mode: user.mode || "Both",
        availability: user.availability || "Weekends & weekday evenings",
        teaches: Array.isArray(user.teaches) ? [...user.teaches] : [],
        wants: Array.isArray(user.wants) ? [...user.wants] : [],
        instagram: user.socials?.instagram || "",
        twitter: user.socials?.twitter || "",
        linkedin: user.socials?.linkedin || "",
        github: user.socials?.github || "",
      });
    }
    setTeachInput("");
    setWantInput("");
    setTeachError("");
    setWantError("");
    setErrorMsg("");
    setImgError("");
    setSuccessMsg("");
  };

  // Save changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    setErrorMsg("");
    setSuccessMsg("");
    setImgError("");

    // Validate full name
    const trimmedFullName = form.fullName.trim();
    if (!trimmedFullName || trimmedFullName.length < 2) {
      setErrorMsg("Please enter your full name (minimum 2 characters).");
      return;
    }
    if (trimmedFullName.length > 70) {
      setErrorMsg("Full name cannot exceed 70 characters.");
      return;
    }

    // Validate social links against unsafe schemes
    if (
      !isSafeSocialInput(form.instagram) ||
      !isSafeSocialInput(form.twitter) ||
      !isSafeSocialInput(form.linkedin) ||
      !isSafeSocialInput(form.github)
    ) {
      setErrorMsg("Social profile links contain invalid or disallowed schemes.");
      return;
    }

    const payload = {
      fullName: trimmedFullName,
      name: trimmedFullName.split(" ")[0] || "Member",
      location: form.location.trim() || `${form.city.trim() || "Kochi"}, Kerala`,
      city: form.city.trim() || form.location.split(",")[0].trim() || "Kochi",
      bio: form.bio.trim(),
      photo: form.photo ? form.photo.trim() : "",
      mode: form.mode,
      availability: form.availability.trim(),
      teaches: form.teaches,
      wants: form.wants,
      socials: {
        instagram: form.instagram.trim(),
        twitter: form.twitter.trim(),
        linkedin: form.linkedin.trim(),
        github: form.github.trim(),
      },
    };

    setSaving(true);
    try {
      const res = await dispatch(updateUserAsync(payload));
      if (updateUserAsync.fulfilled.match(res)) {
        dispatch(updateUser(res.payload));
        dispatch(fetchNotificationsAsync());
        setSuccessMsg("Profile updated successfully!");
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => setSuccessMsg(""), 3500);
      } else {
        setErrorMsg(res.payload || "Failed to update profile. Please try again.");
      }
    } catch {
      setErrorMsg("An unexpected error occurred while saving your profile.");
    } finally {
      setSaving(false);
    }
  };

  const modeBadge =
    form.mode === "Offline" ? "📍 Offline" : form.mode === "Online" ? "🌐 Online" : "🔄 Both (Online & Offline)";

  const avatarSrc = form.photo || user?.photo || DEFAULT_AVATAR;

  return (
    <>
      <div className="page-head">
        <h1>My Profile</h1>
        <p>Manage your public persona, skills offered, learning interests, and contact details.</p>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div className="profile-alert-box success">
          <FiCheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="profile-alert-box error">
          <FiAlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. PROFILE INFORMATION SUMMARY CARD */}
      <div className="dash-panel" style={{ marginBottom: 24 }}>
        <div className="profile-summary-header">
          <div className="profile-summary-avatar">
            <img
              src={avatarSrc}
              alt={form.fullName || "User Avatar"}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.fullName || "Member")}&background=F7C843&color=111111`;
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 26, margin: 0, fontWeight: 800 }}>
                {form.fullName || user?.fullName || user?.name || "Member Profile"}
              </h2>
              <span
                style={{
                  fontSize: 12.5,
                  padding: "3px 10px",
                  borderRadius: 14,
                  background: "var(--cream)",
                  border: "1px solid var(--border)",
                  fontWeight: 700,
                }}
              >
                {modeBadge}
              </span>
            </div>

            <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 13.5, color: "var(--gray)", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <FiMail /> <span style={{ color: "var(--ink)", fontWeight: 500 }}>{user?.email || "—"}</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <FiMapPin /> <span style={{ color: "var(--ink)", fontWeight: 500 }}>{form.city ? `${form.city}, Kerala` : form.location || "Kerala, India"}</span>
              </span>
            </div>

            <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 13.5, color: "var(--gray)", flexWrap: "wrap" }}>
              <span className="profile-stat-badge">
                <FiStar fill="#F7C843" stroke="#111" /> <b>{user?.rating > 0 ? Number(user.rating).toFixed(1) : "Unrated"}</b> rating
              </span>
              <span className="profile-stat-badge">
                <FiAward /> <b>{user?.completed || 0}</b> completed exchanges
              </span>
            </div>

            {/* Social links row */}
            <div className="socials" style={{ marginTop: 12 }}>
              <a
                href={getSocialUrl("instagram", form.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title={form.instagram ? `Instagram: ${form.instagram}` : "Visit Instagram"}
              >
                <FiInstagram />
              </a>
              <a
                href={getSocialUrl("twitter", form.twitter)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                title={form.twitter ? `Twitter / X: ${form.twitter}` : "Visit Twitter / X"}
              >
                <FiTwitter />
              </a>
              <a
                href={getSocialUrl("linkedin", form.linkedin)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                title={form.linkedin ? `LinkedIn: ${form.linkedin}` : "Visit LinkedIn"}
              >
                <FiLinkedin />
              </a>
              <a
                href={getSocialUrl("github", form.github)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                title={form.github ? `GitHub: ${form.github}` : "Visit GitHub"}
              >
                <FiGithub />
              </a>
            </div>
          </div>
        </div>

        {form.bio && (
          <p style={{ margin: "18px 0 0", fontSize: 14, color: "var(--gray)", lineHeight: 1.6, borderTop: "1px dashed var(--border)", paddingTop: 14 }}>
            {form.bio}
          </p>
        )}
      </div>

      {/* 2. DYNAMIC PROFILE COMPLETENESS CARD */}
      <div className="completeness-card">
        <div className="completeness-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Profile Completeness</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: 999,
                background: completeness.score === 100 ? "#ecfdf5" : "var(--yellow)",
                color: completeness.score === 100 ? "#065f46" : "var(--ink)",
                border: "1px solid var(--border)",
              }}
            >
              {completeness.score}%
            </span>
          </div>
          <span style={{ fontSize: 13, color: "var(--gray)" }}>{completeness.tip}</span>
        </div>

        <div className="completeness-bar">
          <div
            className="completeness-fill"
            style={{
              width: `${completeness.score}%`,
              background: completeness.score === 100 ? "#10b981" : completeness.score >= 60 ? "#F7C843" : "#f97316",
            }}
          />
        </div>
      </div>

      {/* 3. EDIT PROFILE FORM */}
      <div className="dash-panel">
        <div className="panel-title" style={{ marginBottom: 18 }}>
          <h3>Edit Profile Information</h3>
        </div>

        <form onSubmit={handleSubmit}>
          {/* PROFILE IMAGE UPLOAD & PREVIEW */}
          <div style={{ display: "flex", gap: 22, alignItems: "center", marginBottom: 28, flexWrap: "wrap" }}>
            <div className="pc-photo-wrap" style={{ width: 92, height: 92, flexShrink: 0 }}>
              <img
                src={form.photo || DEFAULT_AVATAR}
                alt="profile preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.fullName || "Member")}&background=F7C843&color=111111`;
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: "min(100%, 280px)", display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontWeight: 700, fontSize: 14 }}>Profile Photo</label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handleImageFileChange}
                />
                <button
                  type="button"
                  className="btn btn-dark btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                >
                  <FiUpload /> Upload from device
                </button>

                {form.photo && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, photo: "" }));
                      setImgError("");
                    }}
                  >
                    Reset photo
                  </button>
                )}
              </div>

              {imgError && (
                <p style={{ fontSize: 12.5, color: "#b91c1c", margin: 0, fontWeight: 600 }}>
                  {imgError}
                </p>
              )}

              <p style={{ fontSize: 13, color: "var(--gray)", margin: 0 }}>
                Supported formats: JPG, JPEG, PNG, or WebP (max 2MB), or paste a direct image URL below.
              </p>

              <input
                className="input"
                value={form.photo && form.photo.startsWith("data:") ? "" : form.photo}
                onChange={setField("photo")}
                placeholder={form.photo && form.photo.startsWith("data:") ? "Image loaded from device" : "Or paste image URL (https://…)"}
                style={{ fontSize: 13.5 }}
              />
            </div>
          </div>

          {/* BASIC INFORMATION GRID */}
          <div className="form-grid">
            <div className="field">
              <label>Full Name *</label>
              <input
                className="input"
                value={form.fullName}
                onChange={setField("fullName")}
                placeholder="e.g. Alice Thomas"
                required
              />
            </div>

            <div className="field">
              <label>City / Location</label>
              <input
                className="input"
                value={form.city}
                onChange={setField("city")}
                placeholder="e.g. Kochi"
              />
            </div>

            <div className="field">
              <label>Exchange Mode</label>
              <select className="input" value={form.mode} onChange={setField("mode")}>
                <option value="Online">🌐 Online (Remote Only)</option>
                <option value="Offline">📍 Offline (In-Person Only)</option>
                <option value="Both">🔄 Both (Online & Offline)</option>
              </select>
            </div>

            <div className="field">
              <label>Availability</label>
              <input
                className="input"
                value={form.availability}
                onChange={setField("availability")}
                placeholder="e.g. Weekends 10 AM - 2 PM"
              />
            </div>

            <div className="field full">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label>Bio</label>
                <span style={{ fontSize: 12, color: "var(--gray)" }}>{form.bio.length} / 500</span>
              </div>
              <textarea
                className="input"
                rows={3}
                maxLength={500}
                value={form.bio}
                onChange={setField("bio")}
                placeholder="Tell other members what you love learning, teaching, and sharing…"
              />
            </div>
          </div>

          {/* 4. SKILLS I TEACH (INTERACTIVE TAG BUILDER) */}
          <div style={{ marginTop: 24, marginBottom: 24 }}>
            <label style={{ fontWeight: 700, fontSize: 14, display: "block", marginBottom: 6 }}>
              Skills I Teach (Skills Offered)
            </label>
            <p style={{ fontSize: 13, color: "var(--gray)", marginBottom: 10 }}>
              Add skills you are proficient in and confident sharing with peer learners.
            </p>

            <div className="skill-input-group">
              <input
                className="input"
                value={teachInput}
                onChange={(e) => {
                  setTeachInput(e.target.value);
                  if (teachError) setTeachError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTeach();
                  }
                }}
                placeholder="Add a skill you teach and press Enter (e.g. React, UI Design)"
                style={{ flex: 1, fontSize: 13.5 }}
              />
              <button
                type="button"
                className="btn btn-dark btn-sm"
                onClick={() => handleAddTeach()}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "9px 16px" }}
              >
                <FiPlus /> Add
              </button>
            </div>

            {teachError && (
              <p style={{ fontSize: 12.5, color: "#b91c1c", marginTop: 6, fontWeight: 600 }}>
                {teachError}
              </p>
            )}

            {/* Render interactive teach tags */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {form.teaches.map((t, idx) => (
                <span key={`${t}-${idx}`} className="tag-interactive yellow">
                  {t}
                  <button
                    type="button"
                    className="tag-remove-x"
                    onClick={() => handleRemoveTeach(idx)}
                    title={`Remove ${t}`}
                    aria-label={`Remove ${t}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {form.teaches.length === 0 && (
                <span style={{ fontSize: 13, color: "var(--gray)", fontStyle: "italic" }}>
                  No teaching skills added yet. Add at least one to get matched!
                </span>
              )}
            </div>

            {/* Quick suggestions */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
              <span style={{ fontSize: 12, color: "var(--gray)", fontWeight: 600 }}>Popular:</span>
              {POPULAR_TEACH_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="quick-suggestion-btn"
                  onClick={() => handleAddTeach(suggestion)}
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* 5. SKILLS I WANT TO LEARN (INTERACTIVE TAG BUILDER) */}
          <div style={{ marginTop: 24, marginBottom: 28 }}>
            <label style={{ fontWeight: 700, fontSize: 14, display: "block", marginBottom: 6 }}>
              Skills I Want to Learn (Skills Wanted)
            </label>
            <p style={{ fontSize: 13, color: "var(--gray)", marginBottom: 10 }}>
              Add skills you are curious about and wish to learn from other platform members.
            </p>

            <div className="skill-input-group">
              <input
                className="input"
                value={wantInput}
                onChange={(e) => {
                  setWantInput(e.target.value);
                  if (wantError) setWantError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddWant();
                  }
                }}
                placeholder="Add a skill you want to learn (e.g. Node.js, Python)"
                style={{ flex: 1, fontSize: 13.5 }}
              />
              <button
                type="button"
                className="btn btn-dark btn-sm"
                onClick={() => handleAddWant()}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "9px 16px" }}
              >
                <FiPlus /> Add
              </button>
            </div>

            {wantError && (
              <p style={{ fontSize: 12.5, color: "#b91c1c", marginTop: 6, fontWeight: 600 }}>
                {wantError}
              </p>
            )}

            {/* Render interactive want tags */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {form.wants.map((w, idx) => (
                <span key={`${w}-${idx}`} className="tag-interactive">
                  {w}
                  <button
                    type="button"
                    className="tag-remove-x"
                    onClick={() => handleRemoveWant(idx)}
                    title={`Remove ${w}`}
                    aria-label={`Remove ${w}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {form.wants.length === 0 && (
                <span style={{ fontSize: 13, color: "var(--gray)", fontStyle: "italic" }}>
                  No learning interests added yet. Add some to discover teachers!
                </span>
              )}
            </div>

            {/* Quick suggestions */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
              <span style={{ fontSize: 12, color: "var(--gray)", fontWeight: 600 }}>Popular:</span>
              {POPULAR_WANT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="quick-suggestion-btn"
                  onClick={() => handleAddWant(suggestion)}
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* 6. SOCIAL PROFILES */}
          <div className="panel-title" style={{ marginTop: 28, marginBottom: 8 }}>
            <h3>Social Profiles</h3>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--gray)", marginBottom: 18 }}>
            Add your social usernames or profile links. If provided, profile cards and badges will link directly to your accounts.
          </p>

          <div className="form-grid">
            <div className="field">
              <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <FiInstagram /> Instagram ID / URL
              </label>
              <input
                className="input"
                value={form.instagram}
                onChange={setField("instagram")}
                placeholder="e.g. username or https://instagram.com/username"
              />
            </div>
            <div className="field">
              <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <FiTwitter /> Twitter / X Handle
              </label>
              <input
                className="input"
                value={form.twitter}
                onChange={setField("twitter")}
                placeholder="e.g. username or https://x.com/username"
              />
            </div>
            <div className="field">
              <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <FiLinkedin /> LinkedIn Username / URL
              </label>
              <input
                className="input"
                value={form.linkedin}
                onChange={setField("linkedin")}
                placeholder="e.g. username or https://linkedin.com/in/username"
              />
            </div>
            <div className="field">
              <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <FiGithub /> GitHub Username / URL
              </label>
              <input
                className="input"
                value={form.github}
                onChange={setField("github")}
                placeholder="e.g. username or https://github.com/username"
              />
            </div>
          </div>

          {/* ACTION BUTTONS (SAVE & RESET) */}
          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap", alignItems: "center" }}>
            <button type="submit" className="btn btn-dark" disabled={saving}>
              <FiCheck /> {saving ? "Saving Changes..." : "Save Changes"}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleResetForm}
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FiRefreshCw /> Cancel / Reset
            </button>
          </div>
        </form>
      </div>

      {/* 7. COMMUNITY REVIEWS & ENDORSEMENTS */}
      <div className="dash-panel" style={{ marginTop: 24 }}>
        <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Community Reviews & Endorsements ({(user?.reviews || []).length})</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: 13.5, color: "var(--gray)" }}>
              Verified peer ratings and testimonials from your completed exchanges.
            </p>
          </div>
          <span className="profile-stat-badge">
            <FiStar fill="#F7C843" stroke="#111" /> <b>{user?.rating > 0 ? Number(user.rating).toFixed(1) : "Unrated"}</b>
          </span>
        </div>

        {!(user?.reviews && user.reviews.length > 0) ? (
          <p style={{ color: "var(--gray)", fontSize: 14, margin: "14px 0 0" }}>
            No reviews received yet. Complete learning exchanges to build your trusted peer reputation!
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginTop: 16 }}>
            {user.reviews.map((r, i) => (
              <div
                key={i}
                style={{
                  background: "var(--cream)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <b style={{ fontSize: 14.5 }}>{r.from || "Peer Learner"}</b>
                    <span className="stars">
                      {[...Array(r.rating || 5)].map((_, s) => (
                        <FiStar key={s} fill="#F7C843" stroke="#111" />
                      ))}
                    </span>
                  </div>
                  <p style={{ color: "var(--ink)", fontSize: 13.5, margin: "4px 0", fontStyle: "italic", lineHeight: 1.5 }}>
                    “{r.text}”
                  </p>
                </div>
                {r.date && (
                  <div style={{ fontSize: 12, color: "var(--gray)", marginTop: 10 }}>
                    {r.date}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
