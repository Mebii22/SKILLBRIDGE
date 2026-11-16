import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FiCalendar, FiArrowRight, FiCheck, FiX, FiFileText } from "react-icons/fi";
import { acceptRequest, rejectRequest, cancelExchange } from "../redux/slices/exchangeSlice";
import { addNotification } from "../redux/slices/notificationSlice";

const LABELS = { pending: "Pending Agreement", active: "In Progress", completed: "Completed", cancelled: "Cancelled" };

export default function ExchangeCard({ ex }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const totalSessions = ex.totalSessions || 4;
  const completedSessions = ex.completedSessions || 0;
  const modeBadge = ex.mode === "Offline" ? "📍 Offline" : "🌐 Online";

  return (
    <div className="ex-row">
      <img className="ex-avatar" src={ex.partnerPhoto} alt={ex.partnerName} />
      <div className="ex-info">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="ex-name">{ex.partnerName}</div>
          <span style={{ fontSize: 11.5, padding: "1px 6px", borderRadius: 8, background: "var(--cream)", border: "1px solid var(--border)" }}>
            {modeBadge}
          </span>
        </div>
        <div className="ex-swap">
          Teaches <b>{ex.teach}</b> ↔ Wants <b>{ex.want}</b>
        </div>
        {ex.status === "active" && (
          <div className="progress"><i style={{ width: `${ex.progress || 0}%` }} /></div>
        )}
        <div className="ex-meta">
          <span className={`status-pill st-${ex.status}`}>{LABELS[ex.status]}</span>
          {ex.status === "active" && (
            <span>{completedSessions}/{totalSessions} sessions ({ex.progress || 0}%)</span>
          )}
          {ex.nextSession && (
            <span><FiCalendar /> Next: {ex.nextSession.date} · {ex.nextSession.time}</span>
          )}
        </div>
      </div>
      <div className="ex-actions">
        {ex.status === "pending" && (
          <>
            <button
              className="btn-xs dark"
              onClick={() => {
                dispatch(acceptRequest(ex.id));
                dispatch(addNotification({
                  type: "accepted",
                  title: "Exchange agreement accepted",
                  text: `You accepted the skill swap agreement with ${ex.partnerName}.`,
                }));
              }}
            >
              <FiCheck /> Accept
            </button>
            <button className="btn-xs danger" onClick={() => dispatch(rejectRequest(ex.id))}>
              <FiX /> Reject
            </button>
            <button className="btn-xs" onClick={() => navigate(`/exchanges/${ex.id}`)}>
              <FiFileText /> Agreement
            </button>
          </>
        )}
        {ex.status === "active" && (
          <>
            <button className="btn-xs dark" onClick={() => navigate(`/exchanges/${ex.id}`)}>View Details</button>
            <button className="btn-xs danger" onClick={() => dispatch(cancelExchange(ex.id))}>Cancel</button>
          </>
        )}
        {ex.status === "completed" && (
          <button className="btn-xs" onClick={() => navigate(`/exchanges/${ex.id}`)}>
            View Details <FiArrowRight />
          </button>
        )}
      </div>
    </div>
  );
}
