import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiEye, FiEyeOff } from "react-icons/fi";
import DoodleIllustration from "../components/DoodleIllustration";
import { loginUser } from "../redux/slices/userSlice";
import { currentUser as defaultMebin } from "../data/dummyData";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const communityUsers = useSelector((s) => s.user.users);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: undefined });
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Please enter a valid email address.";
    if (form.password.length < 6) errs.password = "Password must be at least 6 characters.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const emailKey = form.email.trim().toLowerCase();

    // Check in registered accounts
    let storedAccounts = [];
    try {
      storedAccounts = JSON.parse(localStorage.getItem("skillbridge_registered_accounts") || "[]");
    } catch {
      storedAccounts = [];
    }

    const matchedAccount = storedAccounts.find((a) => a.email.toLowerCase() === emailKey);

    if (matchedAccount) {
      if (matchedAccount.password !== form.password) {
        setErrors({ password: "Incorrect password. Please try again." });
        return;
      }
      // Check if user status is disabled in current user list
      const liveUser = (communityUsers || []).find((u) => u.email && u.email.toLowerCase() === emailKey) || matchedAccount.user;
      if (liveUser.status === "Disabled") {
        setErrors({ email: "This account has been disabled by an administrator. Please contact support." });
        return;
      }

      dispatch(loginUser(liveUser));
      navigate("/dashboard");
      return;
    }

    // Check if it's default demo user (mebin)
    if (emailKey === defaultMebin.email.toLowerCase()) {
      const liveUser = (communityUsers || []).find((u) => u.email && u.email.toLowerCase() === emailKey) || defaultMebin;
      if (liveUser.status === "Disabled") {
        setErrors({ email: "This account has been disabled by an administrator. Please contact support." });
        return;
      }
      dispatch(loginUser(liveUser));
      navigate("/dashboard");
      return;
    }

    // Check if it's any of the demo community users (e.g. arjun.m@example.com)
    const demoUser = (communityUsers || []).find((u) => u.email && u.email.toLowerCase() === emailKey);
    if (demoUser) {
      if (demoUser.status === "Disabled") {
        setErrors({ email: "This account has been disabled by an administrator. Please contact support." });
        return;
      }
      dispatch(loginUser(demoUser));
      navigate("/dashboard");
      return;
    }

    setErrors({ email: "No account found with this email. Please check your email or create one." });
  };

  return (
    <div className="auth-page">
      <div className="auth-panel panel">
        <form className="auth-form" onSubmit={submit} noValidate>
          <h1>Welcome back</h1>
          <p className="auth-sub">Log in to continue your learning journey.</p>

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
            <a href="#" className="link">Forgot password?</a>
          </div>

          <button type="submit" className="btn btn-dark btn-block">Login</button>

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
