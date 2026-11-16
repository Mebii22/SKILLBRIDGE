import { useSelector, useDispatch } from "react-redux";
import SkillTag from "../../components/SkillTag";
import { approveSkill, removeSkill } from "../../redux/slices/adminSlice";

export default function SkillListings() {
  const listings = useSelector((s) => s.admin.skillListings);
  const dispatch = useDispatch();

  const approve = (id) => dispatch(approveSkill(id));
  const remove = (id) => dispatch(removeSkill(id));

  return (
    <>
      <div className="page-head">
        <h1>Skill Listings</h1>
        <p>Review and approve skill listings submitted by users.</p>
      </div>

      <div className="dash-panel" style={{ padding: 18 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Skill</th><th>Category</th><th>User</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 700 }}>{l.skill}</td>
                  <td><SkillTag>{l.category}</SkillTag></td>
                  <td className="t-mail">{l.user}</td>
                  <td>
                    <span className={`status-pill ${l.status === "approved" ? "st-completed" : "st-pending"}`}>
                      {l.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      {l.status !== "approved" && (
                        <button className="btn-xs dark" onClick={() => approve(l.id)}>Approve</button>
                      )}
                      <button className="btn-xs danger" onClick={() => remove(l.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
              {listings.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--gray)" }}>All listings removed.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
