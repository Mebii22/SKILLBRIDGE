import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiCheck, FiCamera, FiUpload, FiInstagram, FiTwitter, FiLinkedin, FiGithub } from "react-icons/fi";
import SkillTag from "../../components/SkillTag";
import { updateUser, updateUserAsync, fetchMeAsync } from "../../redux/slices/userSlice";
import { fetchNotificationsAsync } from "../../redux/slices/notificationSlice";

export default function MyProfile() {
  const user = useSelector((s) => s.user.currentUser);
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchMeAsync());
  }, [dispatch]);

  const [form, setForm] = useState({
    fullName: user?.fullName || user?.name || "",
    location: user?.location || "",
    city: user?.city || "",
    bio: user?.bio || "",
    photo: user?.photo || "",
    mode: user?.mode || "Both",
    availability: user?.availability || "Weekends & weekday evenings",
    teaches: (user?.teaches || []).join(", "),
    wants: (user?.wants || []).join(", "),
    instagram: user?.socials?.instagram || "",
    twitter: user?.socials?.twitter || "",
    linkedin: user?.socials?.linkedin || "",
    github: user?.socials?.github || "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || user.name || "",
        location: user.location || "",
        city: user.city || "",
        bio: user.bio || "",
        photo: user.photo || "",
        mode: user.mode || "Both",
        availability: user.availability || "Weekends & weekday evenings",
        teaches: (user.teaches || []).join(", "),
        wants: (user.wants || []).join(", "),
        instagram: user.socials?.instagram || "",
        twitter: user.socials?.twitter || "",
        linkedin: user.socials?.linkedin || "",
        github: user.socials?.github || "",
      });
    }
  }, [user]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleDeviceUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Please select an image smaller than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setForm((prev) => ({ ...prev, photo: reader.result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;

    const cleanTeaches = form.teaches.split(",").map((s) => s.trim()).filter(Boolean);
    const cleanWants = form.wants.split(",").map((s) => s.trim()).filter(Boolean);
    const firstName = form.fullName.trim().split(" ")[0] || "Learner";

    const updatedProfile = {
      fullName: form.fullName.trim(),
      name: firstName,
      location: form.location.trim(),
      city: form.city.trim() || form.location.split(",")[0].trim(),
      bio: form.bio.trim(),
      photo: form.photo.trim(),
      mode: form.mode,
      availability: form.availability.trim(),
      teaches: cleanTeaches,
      wants: cleanWants,
      socials: {
        instagram: form.instagram.trim(),
        twitter: form.twitter.trim(),
        linkedin: form.linkedin.trim(),
        github: form.github.trim(),
      },
    };

    setSaving(true);
    try {
      const res = await dispatch(updateUserAsync(updatedProfile));
      if (updateUserAsync.fulfilled.match(res)) {
        dispatch(updateUser(res.payload?.user || updatedProfile));
        dispatch(fetchNotificationsAsync());
        setSaved(true);
        setTimeout(() => setSaved(false), 2600);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>My Profile</h1>
        <p>Edit how others see you on SkillBridge.</p>
      </div>

      <div className="dash-panel">
        {saved && <div className="success-msg"><FiCheck /> Profile updated successfully!</div>}
        <form onSubmit={save}>
          <div style={{ display: "flex", gap: 22, alignItems: "center", marginBottom: 28, flexWrap: "wrap" }}>
            <div className="pc-photo-wrap" style={{ width: 92, height: 92, flexShrink: 0 }}>
              <img
                src={form.photo || "https://randomuser.me/api/portraits/men/22.jpg"}
                alt="profile preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ flex: 1, minWidth: "min(100%, 260px)", display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontWeight: 700, fontSize: 14 }}>Profile Photo</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleDeviceUpload}
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
                    onClick={() => setForm({ ...form, photo: "" })}
                  >
                    Reset photo
                  </button>
                )}
              </div>
              <p style={{ fontSize: 13, color: "var(--gray)", margin: 0 }}>
                Choose a photo from your computer or phone (JPG, PNG, WebP up to 5MB), or paste an image URL below.
              </p>
              <input
                className="input"
                value={form.photo && form.photo.startsWith("data:") ? "" : form.photo}
                onChange={set("photo")}
                placeholder={form.photo && form.photo.startsWith("data:") ? "Image loaded from device" : "Or paste image URL (https://…)"}
                style={{ fontSize: 13.5 }}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Full Name</label>
              <input className="input" value={form.fullName} onChange={set("fullName")} placeholder="Your full name" />
            </div>
            <div className="field">
              <label>Location / City</label>
              <input className="input" value={form.location} onChange={set("location")} placeholder="Kochi, Kerala" />
            </div>
            <div className="field">
              <label>Exchange Mode</label>
              <select className="input" value={form.mode} onChange={set("mode")}>
                <option value="Online">🌐 Online (Remote Only)</option>
                <option value="Offline">📍 Offline (In-Person Only)</option>
                <option value="Both">🔄 Both (Online & Offline)</option>
              </select>
            </div>
            <div className="field">
              <label>Availability</label>
              <input className="input" value={form.availability} onChange={set("availability")} placeholder="e.g. Weekends 10 AM - 2 PM" />
            </div>
            <div className="field full">
              <label>Bio</label>
              <textarea className="input" value={form.bio} onChange={set("bio")} placeholder="Tell other members what you love learning and teaching…" />
            </div>
            <div className="field">
              <label>Skills I Offer (comma separated)</label>
              <input className="input" value={form.teaches} onChange={set("teaches")} placeholder="React, JavaScript, Photography" />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {form.teaches.split(",").map((s) => s.trim()).filter(Boolean).map((t) => <SkillTag key={t} yellow>{t}</SkillTag>)}
              </div>
            </div>
            <div className="field">
              <label>Skills I Want to Learn (comma separated)</label>
              <input className="input" value={form.wants} onChange={set("wants")} placeholder="Photography, Guitar, Spanish" />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {form.wants.split(",").map((s) => s.trim()).filter(Boolean).map((t) => <SkillTag key={t}>{t}</SkillTag>)}
              </div>
            </div>
          </div>

          <div className="panel-title" style={{ marginTop: 28, marginBottom: 8 }}>
            <h3>Social Profiles</h3>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--gray)", marginBottom: 18 }}>
            Add your social usernames or profile links. If provided, the footer and profile icons will link directly to your account.
          </p>

          <div className="form-grid">
            <div className="field">
              <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <FiInstagram /> Instagram ID / URL
              </label>
              <input
                className="input"
                value={form.instagram}
                onChange={set("instagram")}
                placeholder="e.g. username or https://instagram.com/…"
              />
            </div>
            <div className="field">
              <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <FiTwitter /> Twitter / X Handle
              </label>
              <input
                className="input"
                value={form.twitter}
                onChange={set("twitter")}
                placeholder="e.g. username or https://x.com/…"
              />
            </div>
            <div className="field">
              <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <FiLinkedin /> LinkedIn Username / URL
              </label>
              <input
                className="input"
                value={form.linkedin}
                onChange={set("linkedin")}
                placeholder="e.g. username or https://linkedin.com/in/…"
              />
            </div>
            <div className="field">
              <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <FiGithub /> GitHub Username / URL
              </label>
              <input
                className="input"
                value={form.github}
                onChange={set("github")}
                placeholder="e.g. username or https://github.com/…"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-dark" style={{ marginTop: 16 }} disabled={saving}>
            <FiCamera /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </>
  );
}
