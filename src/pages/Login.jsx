import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FiEye, FiEyeOff, FiCheckCircle } from "react-icons/fi";
import DoodleIllustration from "../components/DoodleIllustration";
import { loginUserAsync } from "../redux/slices/userSlice";

export default function Login() {
  const location = useLocation();
  const [registeredMsg, setRegisteredMsg] = useState(location.state?.registeredMessage || "");
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: undefined });
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Please enter a valid email address.";
    if (form.password.length < 6) errs.password = "Password must be at least 6 characters.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const emailKey = form.email.trim().toLowerCase();
    setLoading(true);

    try {
      const resultAction = await dispatch(loginUserAsync({ email: emailKey, password: form.password }));
      if (loginUserAsync.fulfilled.match(resultAction)) {
        setLoading(false);
        navigate("/dashboard");
      } else {
        setLoading(false);
        const errMsg = resultAction.payload || "Invalid email or password.";
        setErrors({ email: errMsg });
      }
    } catch {
      setLoading(false);
      setErrors({ email: "Login request failed. Please check your credentials or server connection." });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-panel panel">
        <form className="auth-form" onSubmit={submit} noValidate>
          <h1>Welcome back</h1>
          <p className="auth-sub">Log in to continue your learning journey.</p>

          {registeredMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(46, 125, 50, 0.12)",
                color: "#2e7d32",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: 600,
                marginBottom: 16,
                border: "1px solid rgba(46, 125, 50, 0.25)",
              }}
            >
              <FiCheckCircle style={{ flexShrink: 0, fontSize: 16 }} />
              <span>{registeredMsg}</span>
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={form.email}
              onChange={set("email")}
            />
            {errors.email && <div className="error-text">{errors.email}</div>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="pw-wrap">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)} aria-label="Show password">
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password && <div className="error-text">{errors.password}</div>}
          </div>

          <div className="form-row">
            <label className="checkbox">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <a href="#" className="link" onClick={(e) => { e.preventDefault(); alert("Please contact administrator or reset your password in Account Settings once logged in."); }}>Forgot password?</a>
          </div>

          <button type="submit" className="btn btn-dark btn-block" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="auth-alt">
            Don’t have an account? <Link to="/register" className="link">Create one</Link>
          </p>
          <p className="auth-alt" style={{ marginTop: 8, fontSize: 13, color: "var(--gray)" }}>
            Are you an administrator? <Link to="/admin/login" className="link">Admin Login</Link>
          </p>
        </form>

        <div className="auth-side">
          <DoodleIllustration type="connecting" size={250} blob="top" className="float-slow" />
          <h3>Your learning circle is waiting.</h3>
          <p>Pick up right where you left off — sessions, messages and exchange partners.</p>
        </div>
      </div>
    </div>
  );
}
