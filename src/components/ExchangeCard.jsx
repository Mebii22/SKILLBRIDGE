import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FiCalendar, FiArrowRight, FiCheck, FiX, FiFileText } from "react-icons/fi";
import {
  acceptRequest,
  rejectRequest,
  cancelExchange,
  acceptExchangeAsync,
  rejectExchangeAsync,
  cancelExchangeAsync,
} from "../redux/slices/exchangeSlice";
import { addNotification } from "../redux/slices/notificationSlice";

const LABELS = {
  pending: "Pending",
  active: "In Progress",
  accepted: "Accepted",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export default function ExchangeCard({ ex }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const exchangeId = ex._id || ex.id;
  const totalSessions = ex.totalSessions || 4;
  const completedSessions = ex.completedSessions || 0;
  const modeBadge = ex.mode === "Offline" ? "📍 Offline" : "🌐 Online";
  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(ex.partnerName || "Partner")}&background=F5C518&color=111111&bold=true`;

  const statusLabel =
    ex.status === "pending"
      ? ex.isRequester
        ? "Pending Partner Acceptance"
        : "Action Needed"
      : LABELS[ex.status] || ex.status;

  return (
    <div className="ex-row">
      <img
        className="ex-avatar"
        src={ex.partnerPhoto || avatarFallback}
        alt={ex.partnerName}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = avatarFallback;
        }}
      />
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
        {ex.message && (
          <div style={{ fontSize: 12.5, color: "var(--gray)", fontStyle: "italic", margin: "3px 0 1px", wordBreak: "break-word" }}>
            &ldquo;{ex.message}&rdquo;
          </div>
        )}
        {(ex.status === "active" || ex.status === "accepted") && (
          <div className="progress"><i style={{ width: `${ex.progress || 0}%` }} /></div>
        )}
        <div className="ex-meta">
          <span className={`status-pill st-${ex.status}`}>{statusLabel}</span>
          {(ex.status === "active" || ex.status === "accepted") && (
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
            {!ex.isRequester ? (
              <>
                <button
                  className="btn-xs dark"
                  onClick={() => {
                    dispatch(acceptRequest(ex.id || ex._id));
                    dispatch(acceptExchangeAsync(exchangeId));
                    dispatch(addNotification({
                      type: "accepted",
                      title: "Exchange agreement accepted",
                      text: `You accepted the skill swap agreement with ${ex.partnerName}.`,
                    }));
                  }}
                >
                  <FiCheck /> Accept
                </button>
                <button
                  className="btn-xs danger"
                  onClick={() => {
                    dispatch(rejectRequest(ex.id || ex._id));
                    dispatch(rejectExchangeAsync(exchangeId));
                  }}
                >
                  <FiX /> Reject
                </button>
              </>
            ) : (
              <button
                className="btn-xs danger"
                onClick={() => {
                  dispatch(cancelExchange(ex.id || ex._id));
                  dispatch(cancelExchangeAsync(exchangeId));
                }}
              >
                <FiX /> Cancel
              </button>
            )}
            <button className="btn-xs" onClick={() => navigate(`/exchanges/${exchangeId}`)}>
              <FiFileText /> Agreement
            </button>
          </>
        )}
        {(ex.status === "active" || ex.status === "accepted") && (
          <>
            <button
              className="btn-xs"
              style={{ background: "#F7C843", color: "#111", border: "1px solid #e0b435", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}
              onClick={() => navigate("/sessions", { state: { partner: ex.partnerName, skill: ex.want, exchangeId } })}
              title="Schedule a session for this exchange"
            >
              <FiCalendar /> Schedule
            </button>
            <button className="btn-xs dark" onClick={() => navigate(`/exchanges/${exchangeId}`)}>View Details</button>
            <button
              className="btn-xs danger"
              onClick={() => {
                dispatch(cancelExchange(ex.id || ex._id));
                dispatch(cancelExchangeAsync(exchangeId));
              }}
            >
              Cancel
            </button>
          </>
        )}
        {ex.status === "completed" && (
          <button
            className="btn-xs dark"
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
            onClick={() => navigate(`/exchanges/${exchangeId}`)}
          >
            {ex.hasReviewed || ex.myReview ? "View Agreement" : "★ Rate & Review"} <FiArrowRight />
          </button>
        )}
      </div>
    </div>
  );
}
