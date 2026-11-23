import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FiEye, FiEyeOff, FiShield } from "react-icons/fi";
import { LogoMark } from "../../components/Navbar";
import API from "../../api/client";
import { loginUser } from "../../redux/slices/userSlice";

/* Private admin access portal — reachable ONLY via the direct route /admin/login.
   Restricted to authorized SkillBridge platform administrators. */
export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/admin/login", {
        email: form.email.trim(),
        password: form.password,
      });

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("adminLoggedIn", "true");
        if (res.data.admin) {
          localStorage.setItem("currentUser", JSON.stringify(res.data.admin));
          dispatch(loginUser(res.data.admin));
        }
        setLoading(false);
        navigate("/admin/dashboard");
        return;
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "Invalid administrator credentials.");
      return;
    }

    setLoading(false);
    setError("Invalid administrator credentials.");
  };

  return (
    <div className="admin-login-page">
      <div className="panel admin-panel-card" style={{ width: "100%", maxWidth: 430, borderRadius: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
          <LogoMark size={28} />
          <span className="serif" style={{ fontWeight: 800, fontSize: 22 }}>skillbridge</span>
        </div>

        <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--yellow)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18 }}>
          <FiShield />
        </div>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>Admin Access</h1>
        <p style={{ color: "var(--gray)", fontSize: 14.5, marginBottom: 28 }}>Manage the SkillBridge community.</p>

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="admin-email">Admin Email</label>
            <input
              id="admin-email"
              type="email"
              className="input"
              placeholder="admin@skillbridge.com"
              value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(""); }}
            />
          </div>
          <div className="field">
            <label htmlFor="admin-password">Password</label>
            <div className="pw-wrap">
              <input
                id="admin-password"
                type={showPw ? "text" : "password"}
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)} aria-label="Show password">
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {error && <div className="error-text" style={{ marginBottom: 16 }}>{error}</div>}

          <button type="submit" className="btn btn-dark btn-block">Login to Dashboard</button>
        </form>
      </div>
    </div>
  );
}
