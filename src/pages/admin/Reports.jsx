import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  reviewReport,
  resolveReport,
  removeReport,
  fetchAdminReportsAsync,
  reviewReportAsync,
  resolveReportAsync,
  deleteAdminReportAsync,
} from "../../redux/slices/adminSlice";

export default function Reports() {
  const list = useSelector((s) => s.admin.reports);
  const dispatch = useDispatch();
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    dispatch(fetchAdminReportsAsync());
  }, [dispatch]);

  const handleReview = async (id, r) => {
    const targetId = r?._id || id;
    dispatch(reviewReport(id));
    await dispatch(reviewReportAsync(targetId));
  };

  const handleResolve = async (id, r) => {
    const targetId = r?._id || id;
    dispatch(resolveReport(id));
    await dispatch(resolveReportAsync(targetId));
  };

  const handleRemove = async (id, r) => {
    const targetId = r?._id || id;
    if (window.confirm(`Permanently remove report for "${r?.target || "content"}"?`)) {
      setActionLoadingId(targetId);
      dispatch(removeReport(id));
      try {
        await dispatch(deleteAdminReportAsync(targetId)).unwrap();
      } catch (err) {
        alert(err || "Failed to remove report from server");
        dispatch(fetchAdminReportsAsync());
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Reported Content</h1>
        <p>Review reports from the community and keep SkillBridge safe.</p>
      </div>

      <div className="dash-panel" style={{ padding: 18 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Reported</th><th>Reason</th><th>Date</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r._id || r.id}>
                  <td style={{ fontWeight: 700 }}>{r.target}</td>
                  <td className="t-mail">{r.reason}</td>
                  <td className="t-mail">{r.date}</td>
                  <td>
                    <span className={`status-pill ${r.status === "open" ? "st-cancelled" : r.status === "resolved" ? "st-completed" : "st-pending"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {r.status === "open" && (
                        <button className="btn-xs" onClick={() => handleReview(r.id, r)}>Review</button>
                      )}
                      {r.status !== "resolved" && (
                        <button className="btn-xs dark" onClick={() => handleResolve(r.id, r)}>Resolve</button>
                      )}
                      <button className="btn-xs danger" onClick={() => handleRemove(r.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--gray)" }}>No reports left — great job!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
