import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FiEye, FiEyeOff, FiUpload, FiPlus, FiX } from "react-icons/fi";
import DoodleIllustration from "../components/DoodleIllustration";
import { registerUserAsync } from "../redux/slices/userSlice";

const SUGGESTED_TEACH = ["React", "JavaScript", "HTML/CSS", "UI Design", "Python", "Photography", "English"];
const SUGGESTED_WANT = ["Node.js", "MongoDB", "German", "Graphic Design", "Video Editing", "Public Speaking", "Spanish"];

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    city: "",
    bio: "",
    mode: "Both", // "Online", "Offline", "Both"
    photo: "",
    teaches: [],
    wants: [],
  });

  const [teachInput, setTeachInput] = useState("");
  const [wantInput, setWantInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: undefined, general: undefined });
  };

  // Skill management: Teaches
  const addTeachSkill = (skill) => {
    const clean = (skill || "").trim();
    if (!clean) return;
    if (form.teaches.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setErrors((prev) => ({ ...prev, teaches: `"${clean}" is already in your teaching list.` }));
      return;
    }
    setForm((prev) => ({ ...prev, teaches: [...prev.teaches, clean] }));
    setTeachInput("");
    setErrors((prev) => ({ ...prev, teaches: undefined }));
  };

  const removeTeachSkill = (skill) => {
    setForm((prev) => ({ ...prev, teaches: prev.teaches.filter((s) => s !== skill) }));
  };

  // Skill management: Wants
  const addWantSkill = (skill) => {
    const clean = (skill || "").trim();
    if (!clean) return;
    if (form.wants.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setErrors((prev) => ({ ...prev, wants: `"${clean}" is already in your learning list.` }));
      return;
    }
    setForm((prev) => ({ ...prev, wants: [...prev.wants, clean] }));
    setWantInput("");
    setErrors((prev) => ({ ...prev, wants: undefined }));
  };

  const removeWantSkill = (skill) => {
    setForm((prev) => ({ ...prev, wants: prev.wants.filter((s) => s !== skill) }));
  };

  const handleDeviceImage = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, photo: "Please select an image smaller than 5MB." }));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setForm((prev) => ({ ...prev, photo: reader.result }));
          setErrors((prev) => ({ ...prev, photo: undefined }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 3) errs.name = "Please enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Please enter a valid email address.";
    if (form.password.length < 6) errs.password = "Password must be at least 6 characters.";
    if (form.confirm !== form.password) errs.confirm = "Passwords do not match.";
    if (!form.city.trim()) errs.city = "Please enter your city.";
    if (!form.bio.trim()) errs.bio = "Please write a short bio about what you know and want to learn.";
    if (!form.teaches || form.teaches.length === 0) errs.teaches = "Please add at least one skill you can teach.";
    if (!form.wants || form.wants.length === 0) errs.wants = "Please add at least one skill you want to learn.";

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const emailKey = form.email.trim().toLowerCase();
    const fullName = form.name.trim();
    const firstName = fullName.split(" ")[0];
    const defaultAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

    const userPayload = {
      name: firstName,
      fullName: fullName,
      email: emailKey,
      password: form.password,
      city: form.city.trim(),
      location: `${form.city.trim()}, Kerala`,
      bio: form.bio.trim(),
      mode: form.mode,
      photo: form.photo || defaultAvatar,
      teaches: form.teaches,
      wants: form.wants,
    };

    setSubmitting(true);
    try {
      const resultAction = await dispatch(registerUserAsync(userPayload));
      if (registerUserAsync.fulfilled.match(resultAction)) {
        setSubmitting(false);
        navigate("/login", {
          state: {
            registeredMessage: "Account created successfully! Please log in with your email and password."
          }
        });
      } else {
        setSubmitting(false);
        const errMsg = resultAction.payload || "Registration failed. Please try again.";
        if (errMsg.toLowerCase().includes("email")) {
          setErrors({ email: errMsg });
        } else {
          setErrors({ general: errMsg });
        }
      }
    } catch {
      setSubmitting(false);
      setErrors({ general: "Failed to connect to the registration service. Please verify backend is running." });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-panel panel" style={{ maxWidth: 880 }}>
        <form className="auth-form" onSubmit={submit} noValidate style={{ maxWidth: 440 }}>
          <h1>Create your account</h1>
          <p className="auth-sub">Start sharing what you know.</p>

          {errors.general && (
            <div className="error-text" style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 8, marginBottom: 12 }}>
              {errors.general}
            </div>
          )}

          <div className="field">
            <label htmlFor="name">Full Name</label>
            <input id="name" type="text" className="input" placeholder="Mebin Joseph" value={form.name} onChange={set("name")} />
            {errors.name && <div className="error-text">{errors.name}</div>}
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" placeholder="you@example.com" value={form.email} onChange={set("email")} />
            {errors.email && <div className="error-text">{errors.email}</div>}
          </div>

          <div className="field">
            <label htmlFor="city">City</label>
            <input id="city" type="text" className="input" placeholder="e.g. Kochi, Thrissur, Trivandrum" value={form.city} onChange={set("city")} />
            {errors.city && <div className="error-text">{errors.city}</div>}
          </div>

          <div className="field">
            <label htmlFor="bio">Short Bio</label>
            <textarea
              id="bio"
              className="input"
              style={{ height: 70, resize: "none" }}
              placeholder="e.g. Computer Science student who loves web development and wants to learn German."
              value={form.bio}
              onChange={set("bio")}
            />
            {errors.bio && <div className="error-text">{errors.bio}</div>}
          </div>

          {/* Skills I Can Teach */}
          <div className="field">
            <label htmlFor="teachInput">Skills I Can Teach</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="teachInput"
                type="text"
                className="input"
                placeholder="e.g. React, Python, UI Design"
                value={teachInput}
                onChange={(e) => setTeachInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTeachSkill(teachInput);
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-dark btn-xs"
                style={{ flexShrink: 0 }}
                onClick={() => addTeachSkill(teachInput)}
              >
                <FiPlus /> Add
              </button>
            </div>

            {/* Selected teaching skills */}
            {form.teaches.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {form.teaches.map((s) => (
                  <span key={s} className="tag yellow" style={{ padding: "4px 10px", fontSize: 12 }}>
                    {s}
                    <button
                      type="button"
                      onClick={() => removeTeachSkill(s)}
                      style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 4, display: "inline-flex", alignItems: "center", color: "var(--ink)" }}
                      aria-label={`Remove ${s}`}
                    >
                      <FiX size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick Suggestions for Teach */}
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 11.5, color: "var(--ink-light)", marginRight: 6 }}>Suggested:</span>
              <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                {SUGGESTED_TEACH.filter((s) => !form.teaches.includes(s)).slice(0, 4).map((s) => (
                  <button
                    type="button"
                    key={s}
                    className="btn btn-xs"
                    style={{ padding: "2px 8px", fontSize: 11, background: "var(--surface)", border: "1px solid var(--border)" }}
                    onClick={() => addTeachSkill(s)}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
            {errors.teaches && <div className="error-text">{errors.teaches}</div>}
          </div>

          {/* Skills I Want to Learn */}
          <div className="field">
            <label htmlFor="wantInput">Skills I Want to Learn</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="wantInput"
                type="text"
                className="input"
                placeholder="e.g. Node.js, German, Guitar"
                value={wantInput}
                onChange={(e) => setWantInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addWantSkill(wantInput);
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-dark btn-xs"
                style={{ flexShrink: 0 }}
                onClick={() => addWantSkill(wantInput)}
              >
                <FiPlus /> Add
              </button>
            </div>

            {/* Selected learning skills */}
            {form.wants.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {form.wants.map((s) => (
                  <span key={s} className="tag" style={{ padding: "4px 10px", fontSize: 12 }}>
                    {s}
                    <button
                      type="button"
                      onClick={() => removeWantSkill(s)}
                      style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 4, display: "inline-flex", alignItems: "center", color: "var(--ink)" }}
                      aria-label={`Remove ${s}`}
                    >
                      <FiX size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick Suggestions for Want */}
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 11.5, color: "var(--ink-light)", marginRight: 6 }}>Suggested:</span>
              <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                {SUGGESTED_WANT.filter((s) => !form.wants.includes(s)).slice(0, 4).map((s) => (
                  <button
                    type="button"
                    key={s}
                    className="btn btn-xs"
                    style={{ padding: "2px 8px", fontSize: 11, background: "var(--surface)", border: "1px solid var(--border)" }}
                    onClick={() => addWantSkill(s)}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
            {errors.wants && <div className="error-text">{errors.wants}</div>}
          </div>

          {/* Exchange Mode Preference */}
          <div className="field">
            <label>How would you like to exchange skills?</label>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {[
                { id: "Online", label: "🌐 Online" },
                { id: "Offline", label: "📍 Offline" },
                { id: "Both", label: "🔄 Both" },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={`chip ${form.mode === m.id ? "active" : ""}`}
                  style={{ flex: 1, padding: "8px 12px", justifyContent: "center" }}
                  onClick={() => setForm({ ...form, mode: m.id })}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Profile Picture Upload from Device */}
          <div className="field">
            <label>Profile Picture (Optional)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  border: "2px solid var(--border)",
                  overflow: "hidden",
                  background: "var(--cream)",
                  flexShrink: 0,
                }}
              >
                <img
                  src={form.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
                  alt="Avatar preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleDeviceImage}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FiUpload /> Upload from Device
                </button>
              </div>
            </div>
            {errors.photo && <div className="error-text">{errors.photo}</div>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="pw-wrap">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                className="input"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={set("password")}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)} aria-label="Show password">
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password && <div className="error-text">{errors.password}</div>}
          </div>

          <div className="field">
            <label htmlFor="confirm">Confirm Password</label>
            <input id="confirm" type={showPw ? "text" : "password"} className="input" placeholder="Repeat your password" value={form.confirm} onChange={set("confirm")} />
            {errors.confirm && <div className="error-text">{errors.confirm}</div>}
          </div>

          <button type="submit" className="btn btn-dark btn-block" disabled={submitting}>
            {submitting ? "Creating Account..." : "Create Account"}
          </button>

          <p className="auth-alt">
            Already have an account? <Link to="/login" className="link">Login</Link>
          </p>
        </form>

        <div className="auth-side">
          <DoodleIllustration type="learning" size={250} blob="left" className="float-slow" />
          <h3>Start sharing what you know.</h3>
          <p>One profile, endless skills. Teach something today, learn something tomorrow.</p>
        </div>
      </div>
    </div>
  );
}
