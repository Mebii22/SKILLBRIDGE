import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiEye, FiEyeOff, FiUpload, FiCheck } from "react-icons/fi";
import DoodleIllustration from "../components/DoodleIllustration";
import { registerUser } from "../redux/slices/userSlice";
import { addNotification } from "../redux/slices/notificationSlice";

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
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const existingUsers = useSelector((s) => s.user.users);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: undefined });
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

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 3) errs.name = "Please enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Please enter a valid email address.";
    if (form.password.length < 6) errs.password = "Password must be at least 6 characters.";
    if (form.confirm !== form.password) errs.confirm = "Passwords do not match.";
    if (!form.city.trim()) errs.city = "Please enter your city.";
    if (!form.bio.trim()) errs.bio = "Please write a short bio about what you know and want to learn.";

    const emailKey = form.email.trim().toLowerCase();
    let storedAccounts = [];
    try {
      storedAccounts = JSON.parse(localStorage.getItem("skillbridge_registered_accounts") || "[]");
    } catch {
      storedAccounts = [];
    }

    const emailExistsInAccounts = storedAccounts.some((a) => a.email.toLowerCase() === emailKey);
    const emailExistsInUsers = (existingUsers || []).some((u) => u.email && u.email.toLowerCase() === emailKey);

    if (emailExistsInAccounts || emailExistsInUsers) {
      errs.email = "An account with this email already exists.";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const fullName = form.name.trim();
    const firstName = fullName.split(" ")[0];
    const defaultAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

    const newUser = {
      id: Date.now(),
      name: firstName,
      fullName: fullName,
      email: emailKey,
      location: `${form.city.trim()}, Kerala`,
      city: form.city.trim(),
      photo: form.photo || defaultAvatar,
      bio: form.bio.trim(),
      mode: form.mode,
      rating: 5.0,
      completed: 0,
      teaches: ["Web Development"],
      wants: ["German"],
      match: 95,
      category: "Technology",
      joined: new Date().toISOString().split("T")[0],
      status: "Active",
      reviews: [],
      socials: {
        instagram: "",
        twitter: "",
        linkedin: "",
        github: "",
      },
    };

    dispatch(
      registerUser({
        account: { email: emailKey, password: form.password },
        user: newUser,
      })
    );

    navigate("/dashboard");
  };

  return (
    <div className="auth-page">
      <div className="auth-panel panel" style={{ maxWidth: 880 }}>
        <form className="auth-form" onSubmit={submit} noValidate style={{ maxWidth: 440 }}>
          <h1>Create your account</h1>
          <p className="auth-sub">Start sharing what you know.</p>

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

          <button type="submit" className="btn btn-dark btn-block">Create Account</button>

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
