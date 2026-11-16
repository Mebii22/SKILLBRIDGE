import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiCheck } from "react-icons/fi";
import { deleteUser } from "../../redux/slices/userSlice";

export default function Settings() {
  const user = useSelector((s) => s.user.currentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem("skillbridge_prefs");
      return stored ? JSON.parse(stored) : {
        emailNotifications: true,
        sessionReminders: true,
        publicProfile: true,
      };
    } catch {
      return {
        emailNotifications: true,
        sessionReminders: true,
        publicProfile: true,
      };
    }
  });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  const toggle = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      localStorage.setItem("skillbridge_prefs", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const changePassword = (e) => {
    e.preventDefault();
    if (pw.next.length < 6) {
      setIsError(true);
      setMsg("New password must be at least 6 characters.");
      return;
    }
    if (pw.next !== pw.confirm) {
      setIsError(true);
      setMsg("Passwords do not match.");
      return;
    }

    try {
      const accounts = JSON.parse(localStorage.getItem("skillbridge_registered_accounts") || "[]");
      const userEmail = (user?.email || "").toLowerCase();
      const accountIndex = accounts.findIndex((a) => a.email.toLowerCase() === userEmail);

      if (accountIndex !== -1) {
        if (pw.current && accounts[accountIndex].password && accounts[accountIndex].password !== pw.current) {
          setIsError(true);
          setMsg("Current password is incorrect.");
          return;
        }
        accounts[accountIndex].password = pw.next;
        localStorage.setItem("skillbridge_registered_accounts", JSON.stringify(accounts));
      } else {
        // Create an entry if it was a demo user without a record yet
        accounts.push({
          email: userEmail,
          password: pw.next,
          user,
        });
        localStorage.setItem("skillbridge_registered_accounts", JSON.stringify(accounts));
      }

      setIsError(false);
      setMsg("Password updated successfully!");
      setPw({ current: "", next: "", confirm: "" });
      setTimeout(() => setMsg(""), 3500);
    } catch (err) {
      setIsError(true);
      setMsg("Could not update password. Please try again.");
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete your account? This will remove your profile and log you out.")) {
      if (user?.id) {
        dispatch(deleteUser(user.id));
      }
      navigate("/");
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
        <p>Manage your account preferences.</p>
      </div>

      <div className="dash-panel">
        <div className="panel-title"><h3>Notifications & Privacy</h3></div>
        <div className="settings-row">
          <div>
            <div className="sr-title">Email notifications</div>
            <div className="sr-sub">Get emails about requests, messages and sessions.</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={prefs.emailNotifications} onChange={() => toggle("emailNotifications")} />
            <span className="track" />
          </label>
        </div>
        <div className="settings-row">
          <div>
            <div className="sr-title">Session reminders</div>
            <div className="sr-sub">Remind me 1 hour before a scheduled session.</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={prefs.sessionReminders} onChange={() => toggle("sessionReminders")} />
            <span className="track" />
          </label>
        </div>
        <div className="settings-row">
          <div>
            <div className="sr-title">Public profile</div>
            <div className="sr-sub">Let others find you in Discover.</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={prefs.publicProfile} onChange={() => toggle("publicProfile")} />
            <span className="track" />
          </label>
        </div>
      </div>

      <div className="dash-panel">
        <div className="panel-title"><h3>Change Password</h3></div>
        {msg && (
          <div className={isError ? "error-text" : "success-msg"} style={{ marginBottom: 16 }}>
            {!isError && <FiCheck />} {msg}
          </div>
        )}
        <form onSubmit={changePassword}>
          <div className="form-grid">
            <div className="field">
              <label>Current Password</label>
              <input type="password" className="input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} placeholder="Current password" />
            </div>
            <div className="field">
              <label>New Password</label>
              <input type="password" className="input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="At least 6 characters" />
            </div>
            <div className="field">
              <label>Confirm New Password</label>
              <input type="password" className="input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} placeholder="Repeat new password" />
            </div>
          </div>
          <button type="submit" className="btn btn-outline btn-sm">Update Password</button>
        </form>
      </div>

      <div className="dash-panel">
        <div className="danger-zone">
          <div>
            <div className="dz-title">Delete account</div>
            <p>Permanently remove your account and all associated profile details.</p>
          </div>
          <button className="btn-xs danger" onClick={handleDelete}>Delete Account</button>
        </div>
      </div>
    </>
  );
}
