import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiPlus, FiArrowLeft, FiGlobe, FiClock, FiMapPin } from "react-icons/fi";
import { CATEGORIES, SKILLS } from "../../data/dummyData";
import { updateUser, updateUserAsync } from "../../redux/slices/userSlice";
import { addSkillListing, addSkillListingAsync } from "../../redux/slices/adminSlice";
import { addNotification } from "../../redux/slices/notificationSlice";

const LEVELS = ["Beginner Friendly", "Intermediate", "Advanced / Expert"];

export default function ShareSkill() {
  const currentUser = useSelector((s) => s.user.currentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: currentUser?.fullName || currentUser?.name || "",
    city: currentUser?.city || "",
    bio: currentUser?.bio || "Passionate learner on SkillBridge. Looking forward to exchanging skills with the community!",
    teachSkill: (currentUser?.teaches && currentUser.teaches[0]) || SKILLS[0],
    teachCategory: currentUser?.category || "Technology",
    teachLevel: "Intermediate",
    wantSkill: (currentUser?.wants && currentUser.wants[0]) || SKILLS[5],
    wantCategory: "Photography",
    wantLevel: "Beginner Friendly",
    mode: currentUser?.mode || "Both",
    availability: currentUser?.availability || "Weekends 10:00 AM – 2:00 PM",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setForm((prev) => ({
        ...prev,
        name: currentUser.fullName || currentUser.name || prev.name,
        city: currentUser.city || prev.city,
        bio: currentUser.bio || prev.bio,
        teachSkill: (currentUser.teaches && currentUser.teaches[0]) || prev.teachSkill,
        wantSkill: (currentUser.wants && currentUser.wants[0]) || prev.wantSkill,
        mode: currentUser.mode || prev.mode,
        availability: currentUser.availability || prev.availability,
      }));
    }
  }, [currentUser]);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.teachSkill.trim()) errs.teachSkill = "Please provide the skill you can teach.";
    if (!form.wantSkill.trim()) errs.wantSkill = "Please provide the skill you want to learn.";
    if (!form.city.trim()) errs.city = "Please enter your city.";
    if (!form.availability.trim()) errs.availability = "Please share your weekly availability.";

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Existing skills arrays plus the new ones if not present
    const cleanTeaches = Array.from(new Set([form.teachSkill.trim(), ...(currentUser?.teaches || [])]));
    const cleanWants = Array.from(new Set([form.wantSkill.trim(), ...(currentUser?.wants || [])]));

    const updatedUser = {
      fullName: form.name.trim(),
      name: form.name.trim().split(" ")[0],
      city: form.city.trim(),
      location: `${form.city.trim()}, Kerala`,
      bio: form.bio.trim(),
      mode: form.mode,
      availability: form.availability.trim(),
      category: form.teachCategory,
      teaches: cleanTeaches,
      wants: cleanWants,
    };

    const skillPayload = {
      user: form.name.trim(),
      userPhoto: currentUser?.photo || "https://randomuser.me/api/portraits/men/22.jpg",
      skill: form.teachSkill.trim(),
      category: form.teachCategory,
      mode: form.mode,
      level: form.teachLevel,
    };

    setSubmitting(true);
    try {
      // Optimistic updates
      dispatch(updateUser(updatedUser));
      dispatch(addSkillListing(skillPayload));

      // Real MongoDB Atlas updates
      await dispatch(updateUserAsync(updatedUser));
      await dispatch(addSkillListingAsync(skillPayload));

      dispatch(
        addNotification({
          type: "session",
          title: "Skill listing published!",
          text: `Your listing for ${form.teachSkill} ↔ ${form.wantSkill} is live and visible on Discover.`,
        })
      );

      navigate("/discover");
    } catch {
      setErrors({ general: "Failed to publish skill listing. Please check connection and try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <button type="button" onClick={() => navigate(-1)} className="panel-link" style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <FiArrowLeft /> Back
        </button>
      </div>

      <div className="page-head">
        <h1>Share a Skill</h1>
        <p>List what you can teach, what you wish to learn in return, and find your ideal exchange partner.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Step 1: Your Profile Overview */}
        <div className="dash-panel" style={{ marginBottom: 24 }}>
          <div className="panel-title">
            <h3>1. Profile Details</h3>
          </div>
          <div className="skill-form-grid-2">
            <div className="field">
              <label>Full Name</label>
              <input type="text" className="input" value={form.name} onChange={set("name")} />
            </div>
            <div className="field">
              <label><FiMapPin /> City / Location</label>
              <input type="text" className="input" placeholder="e.g. Kochi, Thrissur, Trivandrum" value={form.city} onChange={set("city")} />
              {errors.city && <div className="error-text">{errors.city}</div>}
            </div>
          </div>
          <div className="field">
            <label>Short Bio</label>
            <textarea
              className="input"
              style={{ height: 70, resize: "none" }}
              value={form.bio}
              onChange={set("bio")}
            />
          </div>
        </div>

        {/* Step 2: What You Can Teach */}
        <div className="dash-panel" style={{ marginBottom: 24 }}>
          <div className="panel-title">
            <h3>2. Skill You Can Teach</h3>
          </div>
          <div className="skill-form-grid-3">
            <div className="field">
              <label>Skill Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. React, Photography, Acoustic Guitar"
                value={form.teachSkill}
                onChange={set("teachSkill")}
              />
              {errors.teachSkill && <div className="error-text">{errors.teachSkill}</div>}
            </div>
            <div className="field">
              <label>Category</label>
              <select className="input" value={form.teachCategory} onChange={set("teachCategory")}>
                {CATEGORIES.filter((c) => c !== "All Skills").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Your Proficiency</label>
              <select className="input" value={form.teachLevel} onChange={set("teachLevel")}>
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: What You Want to Learn */}
        <div className="dash-panel" style={{ marginBottom: 24 }}>
          <div className="panel-title">
            <h3>3. Skill You Want to Learn</h3>
          </div>
          <div className="skill-form-grid-3">
            <div className="field">
              <label>Desired Skill</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Spoken German, UI Design, Video Editing"
                value={form.wantSkill}
                onChange={set("wantSkill")}
              />
              {errors.wantSkill && <div className="error-text">{errors.wantSkill}</div>}
            </div>
            <div className="field">
              <label>Category</label>
              <select className="input" value={form.wantCategory} onChange={set("wantCategory")}>
                {CATEGORIES.filter((c) => c !== "All Skills").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Target Level</label>
              <select className="input" value={form.wantLevel} onChange={set("wantLevel")}>
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 4: Exchange Preferences */}
        <div className="dash-panel" style={{ marginBottom: 24 }}>
          <div className="panel-title">
            <h3>4. Exchange Preferences</h3>
          </div>

          <div className="skill-form-grid-2">
            <div className="field">
              <label><FiGlobe /> How do you want to exchange?</label>
              <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                {[
                  { id: "Online", label: "🌐 Online" },
                  { id: "Offline", label: "📍 Offline" },
                  { id: "Both", label: "🔄 Both" },
                ].map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    className={`chip ${form.mode === m.id ? "active" : ""}`}
                    style={{ flex: 1, minWidth: 85, padding: "8px 12px", justifyContent: "center" }}
                    onClick={() => setForm({ ...form, mode: m.id })}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label><FiClock /> Your Availability</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Weekends 10 AM – 2 PM or Weekdays after 6 PM"
                value={form.availability}
                onChange={set("availability")}
              />
              {errors.availability && <div className="error-text">{errors.availability}</div>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" className="btn btn-dark" disabled={submitting}>
            <FiPlus /> {submitting ? "Publishing..." : "Publish Skill Listing"}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate("/discover")}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
