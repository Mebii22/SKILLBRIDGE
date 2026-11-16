import { useState, Fragment } from "react";
import { useSelector, useDispatch } from "react-redux";
import SkillTag from "../../components/SkillTag";
import { toggleUserStatus } from "../../redux/slices/userSlice";

export default function Users() {
  const users = useSelector((s) => s.user.users);
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState(null);

  const toggleStatus = (id) => {
    dispatch(toggleUserStatus(id));
  };

  return (
    <>
      <div className="page-head">
        <h1>Manage Users</h1>
        <p>{users.length} registered users on SkillBridge.</p>
      </div>

      <div className="dash-panel" style={{ padding: 18 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th><th>Email</th><th>Skills</th><th>Status</th><th>Joined</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <Fragment key={u.id}>
                  <tr>
                    <td>
                      <div className="t-user">
                        <img src={u.photo} alt={u.name} />
                        <div>
                          {u.name}
                          <div className="t-mail">{u.location}</div>
                        </div>
                      </div>
                    </td>
                    <td className="t-mail">{u.email}</td>
                    <td>
                      <div className="mini-tags">
                        {(u.teaches || []).slice(0, 2).map((t) => <SkillTag key={t} yellow>{t}</SkillTag>)}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${u.status === "Active" ? "st-completed" : "st-cancelled"}`}>{u.status}</span>
                    </td>
                    <td className="t-mail">{u.joined}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn-xs" onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
                          {expanded === u.id ? "Hide" : "View"}
                        </button>
                        <button className={`btn-xs ${u.status === "Active" ? "danger" : "dark"}`} onClick={() => toggleStatus(u.id)}>
                          {u.status === "Active" ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === u.id && (
                    <tr>
                      <td colSpan={6} style={{ background: "var(--cream)", fontSize: 13.5, color: "var(--gray)" }}>
                        <b style={{ color: "var(--ink)" }}>Bio:</b> {u.bio || "No bio added yet."}
                        <span style={{ marginLeft: 18 }}><b style={{ color: "var(--ink)" }}>Wants to learn:</b> {(u.wants || []).join(", ") || "None listed"}</span>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
