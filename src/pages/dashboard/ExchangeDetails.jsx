import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  FiArrowLeft, FiCalendar, FiMessageCircle, FiMapPin, FiStar,
  FiVideo, FiCheck, FiExternalLink, FiClock, FiFileText, FiShield,
} from "react-icons/fi";
import SkillTag from "../../components/SkillTag";
import {
  acceptRequest,
  completeExchangeSession,
  submitExchangeReview,
} from "../../redux/slices/exchangeSlice";
import { addReviewToUser } from "../../redux/slices/userSlice";
import { addNotification } from "../../redux/slices/notificationSlice";

const TIMELINE = ["Request Sent", "Agreement Accepted", "First Session", "Learning Together", "Completed"];

export default function ExchangeDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const exchanges = useSelector((s) => s.exchanges.exchanges);
  const allUsers = useSelector((s) => s.user.users);
  const conversations = useSelector((s) => s.messages.conversations);
  const currentUser = useSelector((s) => s.user.currentUser);

  const ex = exchanges.find((e) => String(e.id) === String(id));
  const partner = ex ? (allUsers || []).find((u) => u.id === ex.partnerId || u.name === ex.partnerName) : null;
  const partnerPhoto = partner?.photo || ex?.partnerPhoto;
  const partnerName = partner?.name || ex?.partnerName;
  const partnerId = partner?.id || ex?.partnerId;
  const convo = partnerId ? conversations.find((c) => c.userId === partnerId || c.name === partnerName) : null;

  // Review form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  if (!ex) {
    return (
      <div className="dash-panel">
        <p>Exchange not found. <Link to="/exchanges" className="link">Back to exchanges</Link></p>
      </div>
    );
  }

  const isPending = ex.status === "pending";
  const isActive = ex.status === "active";
  const isCompleted = ex.status === "completed";

  const totalSessions = ex.totalSessions || (ex.sessions ? ex.sessions.length : 4);
  const completedSessions = ex.completedSessions || (ex.sessions ? ex.sessions.filter((s) => s.status === "completed").length : 0);
  const progressPercent = ex.progress !== undefined ? ex.progress : Math.round((completedSessions / totalSessions) * 100);

  // Timeline step calculation
  const currentStep = isCompleted ? 4 : completedSessions > 0 ? 3 : isActive ? 1 : 0;

  // Default agreement if missing
  const agreement = ex.agreement || {
    myCommitment: `I will teach ${ex.teach} (${totalSessions} sessions, ${ex.duration || "1 Hour"} each)`,
    partnerCommitment: `${partnerName} will teach ${ex.want} (${totalSessions} sessions, ${ex.duration || "1 Hour"} each)`,
    mode: ex.mode || "Online",
    totalSessions,
    duration: ex.duration || "1 Hour",
    schedule: "Mutually agreed scheduled time",
    meetingLink: ex.meetingLink || "https://meet.google.com/sb-learn-hub",
    location: ex.meetingLocation || "Central Public Library, Kochi",
    status: ex.status,
    acceptedAt: ex.status === "active" ? "Recently accepted" : null,
  };

  const sessions = ex.sessions || [];

  const handleAcceptAgreement = () => {
    dispatch(acceptRequest(ex.id));
    dispatch(
      addNotification({
        type: "accepted",
        title: "Exchange agreement accepted",
        text: `You and ${partnerName} accepted the skill swap agreement for ${ex.teach} ↔ ${ex.want}!`,
      })
    );
  };

  const handleCompleteSession = (session) => {
    dispatch(completeExchangeSession({ exchangeId: ex.id, sessionId: session.id }));
    dispatch(
      addNotification({
        type: "session",
        title: "Session completed",
        text: `Marked ${session.title} with ${partnerName} as completed. Progress updated!`,
      })
    );
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    const reviewObj = {
      from: currentUser?.name || "Mebin J.",
      rating,
      text: reviewText.trim(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };

    dispatch(submitExchangeReview({ exchangeId: ex.id, rating, review: reviewText.trim() }));
    if (partnerId) {
      dispatch(addReviewToUser({ userId: partnerId, partnerName, review: reviewObj }));
    }
    dispatch(
      addNotification({
        type: "completed",
        title: "Review submitted",
        text: `Thank you for reviewing ${partnerName}! Your feedback builds community trust.`,
      })
    );
    setReviewSubmitted(true);
  };

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <Link to="/exchanges" className="panel-link"><FiArrowLeft /> Back to My Exchanges</Link>
      </div>

      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1>Skill Exchange Agreement</h1>
          <p>
            <SkillTag yellow>{ex.teach}</SkillTag> <span style={{ margin: "0 6px" }}>↔</span> <SkillTag>{ex.want}</SkillTag>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className={`status-pill st-${ex.status}`} style={{ fontSize: 13.5, padding: "6px 14px" }}>
            {isPending ? "Pending Acceptance" : isActive ? "Active Exchange" : isCompleted ? "Completed Exchange" : ex.status}
          </span>
          {isPending && (
            <button className="btn btn-dark btn-sm" onClick={handleAcceptAgreement}>
              <FiCheck /> Accept Agreement
            </button>
          )}
        </div>
      </div>

      {/* Structured Exchange Agreement Card */}
      <div className="dash-panel" style={{ border: "2px solid var(--border)", background: "#fff" }}>
        <div className="panel-title" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FiFileText style={{ fontSize: 20, color: "var(--ink)" }} />
            <h3 style={{ margin: 0 }}>Official Exchange Agreement</h3>
          </div>
          <span style={{ fontSize: 13, color: "var(--gray)" }}>
            {agreement.acceptedAt ? `Accepted on ${agreement.acceptedAt}` : "Status: Awaiting agreement confirmation"}
          </span>
        </div>

        <div className="agreement-commitments-grid">
          <div style={{ background: "var(--cream)", padding: "16px 20px", borderRadius: 16, border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--gray)", display: "block", marginBottom: 6 }}>
              My Commitment
            </span>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
              {agreement.myCommitment}
            </div>
            <div style={{ fontSize: 13, color: "var(--gray)", marginTop: 4 }}>
              Skill provided: <b>{ex.teach}</b>
            </div>
          </div>

          <div style={{ background: "var(--cream)", padding: "16px 20px", borderRadius: 16, border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--gray)", display: "block", marginBottom: 6 }}>
              Partner’s Commitment
            </span>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
              {agreement.partnerCommitment}
            </div>
            <div style={{ fontSize: 13, color: "var(--gray)", marginTop: 4 }}>
              Skill provided: <b>{ex.want}</b> by {partnerName}
            </div>
          </div>
        </div>

        <div className="agreement-meta-grid">
          <div>
            <span style={{ color: "var(--gray)", fontSize: 12.5, display: "block" }}>Exchange Mode</span>
            <b>{ex.mode === "Offline" ? "📍 In-Person (Offline)" : "🌐 Remote (Online)"}</b>
          </div>
          <div>
            <span style={{ color: "var(--gray)", fontSize: 12.5, display: "block" }}>Total Planned Sessions</span>
            <b>{totalSessions} Sessions ({ex.duration || "1 Hour"} each)</b>
          </div>
          <div>
            <span style={{ color: "var(--gray)", fontSize: 12.5, display: "block" }}>Schedule / Frequency</span>
            <b>{agreement.schedule || "Weekly sessions"}</b>
          </div>
          <div>
            <span style={{ color: "var(--gray)", fontSize: 12.5, display: "block" }}>
              {ex.mode === "Offline" ? "Meeting Location" : "Meeting Link"}
            </span>
            {ex.mode === "Offline" ? (
              <b>{agreement.location || ex.meetingLocation || "Public Library, Kochi"}</b>
            ) : (
              <a
                href={agreement.meetingLink || ex.meetingLink || "https://meet.google.com/sb-learn-hub"}
                target="_blank"
                rel="noopener noreferrer"
                className="link"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}
              >
                Join Link <FiExternalLink />
              </a>
            )}
          </div>
        </div>

        {/* Safety notice for offline exchanges */}
        {ex.mode === "Offline" && (
          <div
            style={{
              fontSize: 13,
              color: "#92400e",
              background: "#fef3c7",
              padding: "10px 14px",
              borderRadius: 10,
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <FiShield style={{ fontSize: 16, flexShrink: 0 }} />
            <span><b>Safety Guidance:</b> For your safety, choose a public and comfortable meeting location.</span>
          </div>
        )}

        {/* Meeting Link button for online exchanges */}
        {ex.mode !== "Offline" && (
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--cream)", padding: "12px 18px", borderRadius: 12, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 200, flex: 1 }}>
              <FiVideo style={{ fontSize: 18, color: "var(--ink)", flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, wordBreak: "break-all" }}>Meeting Link: <b>{agreement.meetingLink || ex.meetingLink || "https://meet.google.com/sb-learn-hub"}</b></span>
            </div>
            <a
              href={agreement.meetingLink || ex.meetingLink || "https://meet.google.com/sb-learn-hub"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-dark btn-xs"
              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FiExternalLink /> JOIN SESSION
            </a>
          </div>
        )}
      </div>

      {/* Progress & Partner Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24 }} className="detail-grid">
        {/* Partner Info */}
        <div className="dash-panel">
          <div className="panel-title"><h3>Exchange Partner</h3></div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <img className="ex-avatar" style={{ width: 68, height: 68 }} src={partnerPhoto} alt={partnerName} />
            <div>
              <div className="ex-name" style={{ fontSize: 20 }}>{partnerName}</div>
              <div className="pc-loc" style={{ fontSize: 13.5 }}><FiMapPin /> {partner?.city ? `${partner.city}, Kerala` : partner?.location || "Kochi, Kerala"}</div>
              <div className="stars" style={{ marginTop: 4 }}>
                <FiStar fill="#F7C843" stroke="#111" /> <b>{partner?.rating || 4.9}</b>
                <span style={{ color: "var(--gray)", fontSize: 12.5 }}> · {partner?.completed || 0} completed exchanges</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <Link
              to="/messages"
              state={{ partnerId, partnerName, partnerPhoto }}
              className="btn btn-outline btn-sm"
            >
              <FiMessageCircle /> Chat with Partner
            </Link>
            {partnerId && (
              <Link to={`/profile/${partnerId}`} className="btn btn-dark btn-sm">View Full Profile</Link>
            )}
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="dash-panel">
          <div className="panel-title">
            <h3>Exchange Progress</h3>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{progressPercent}% Complete</span>
          </div>

          <div className="progress" style={{ marginBottom: 18, height: 8 }}>
            <i style={{ width: `${progressPercent}%`, transition: "width 0.4s ease" }} />
          </div>

          <div className="timeline">
            {TIMELINE.map((step, i) => (
              <div key={step} className={`tl-item ${i < currentStep ? "done" : i === currentStep ? "current" : ""}`}>
                <span className="tl-dot" />
                <div className="tl-title">{step}</div>
                <div className="tl-sub">
                  {i < currentStep ? "Completed ✓" : i === currentStep ? (isCompleted ? "Completed" : "In Progress") : "Upcoming"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Session Plan (1, 2, 3, 4...) */}
      <div className="dash-panel">
        <div className="panel-title">
          <div>
            <h3>Exchange Sessions ({completedSessions}/{totalSessions} Completed)</h3>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--gray)" }}>
              Complete sessions and mark them off to build your mutual learning portfolio.
            </p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <p style={{ color: "var(--gray)", fontSize: 14 }}>No session schedule defined yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sessions.map((s, idx) => {
              const isSessionDone = s.status === "completed";
              return (
                <div
                  key={s.id || idx}
                  className="ex-row"
                  style={{
                    opacity: isSessionDone ? 0.85 : 1,
                    background: isSessionDone ? "rgba(46, 125, 50, 0.04)" : "inherit",
                    borderLeft: isSessionDone ? "4px solid #2e7d32" : "4px solid var(--border)",
                  }}
                >
                  <div style={{ minWidth: 32, fontWeight: 700, fontSize: 16, color: isSessionDone ? "#2e7d32" : "var(--gray)" }}>
                    {isSessionDone ? "✓" : `#${s.sessionNum || idx + 1}`}
                  </div>

                  <div className="ex-info">
                    <div className="ex-name" style={{ fontSize: 15.5 }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, margin: "2px 0" }}>
                      Topic: {s.topic || "Practical session exercises"}
                    </div>
                    <div className="ex-meta" style={{ gap: 10 }}>
                      <span className="date-chip"><FiCalendar /> {s.date}</span>
                      <span className="date-chip"><FiClock /> {s.time}</span>
                      <span className="date-chip">{s.duration || "1 Hour"}</span>
                      {s.mode === "Offline" ? (
                        <span className="date-chip"><FiMapPin /> {s.meetingLocation || "In-person"}</span>
                      ) : (
                        <span className="date-chip"><FiVideo /> Remote</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {s.mode !== "Offline" && !isSessionDone && (
                      <a
                        href={s.meetingLink || agreement.meetingLink || "https://meet.google.com/sb-learn-hub"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-xs"
                      >
                        <FiExternalLink /> JOIN SESSION
                      </a>
                    )}

                    {isSessionDone ? (
                      <span className="status-pill st-completed" style={{ fontSize: 12.5 }}>Completed ✓</span>
                    ) : (
                      <button
                        className="btn-xs dark"
                        onClick={() => handleCompleteSession(s)}
                        title="Mark this session completed"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ratings & Reviews Section */}
      {(progressPercent === 100 || isCompleted || completedSessions === totalSessions) && (
        <div className="dash-panel" style={{ border: "2px solid #F7C843", background: "#fffdf5" }}>
          <div className="panel-title">
            <div>
              <h3>Rate & Review Partner</h3>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--gray)" }}>
                Celebrate your completed exchange! Rate {partnerName} to boost their trusted reputation.
              </p>
            </div>
            <span className="status-pill st-completed">Exchange Completed</span>
          </div>

          {ex.review || reviewSubmitted ? (
            <div style={{ padding: "12px 16px", background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span className="stars">
                  {[...Array(ex.rating || rating)].map((_, s) => (
                    <FiStar key={s} fill="#F7C843" stroke="#111" />
                  ))}
                </span>
                <b style={{ fontSize: 15 }}>{(ex.rating || rating)}.0 Star Review Submitted</b>
              </div>
              <p style={{ fontStyle: "italic", color: "var(--ink)", margin: 0 }}>
                “{ex.review || reviewText}”
              </p>
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} style={{ marginTop: 12 }}>
              <div className="field">
                <label>Star Rating</label>
                <div style={{ display: "flex", gap: 8, cursor: "pointer", fontSize: 26 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      <FiStar
                        fill={(hoverRating || rating) >= star ? "#F7C843" : "none"}
                        stroke="#111"
                        style={{ cursor: "pointer" }}
                      />
                    </span>
                  ))}
                  <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 8, alignSelf: "center", color: "var(--gray)" }}>
                    {rating} out of 5 stars
                  </span>
                </div>
              </div>

              <div className="field">
                <label>Your Feedback for {partnerName}</label>
                <textarea
                  className="input"
                  style={{ height: 80, resize: "none" }}
                  placeholder={`Share what you enjoyed learning from ${partnerName} and how they helped you grow...`}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-dark btn-sm">
                <FiStar /> Submit Review & Endorse Partner
              </button>
            </form>
          )}
        </div>
      )}

      {/* Chat messages summary */}
      <div className="dash-panel">
        <div className="panel-title">
          <h3>Recent Messages</h3>
          <Link
            to="/messages"
            state={{ partnerId, partnerName, partnerPhoto }}
            className="panel-link"
          >
            Open chat <FiMessageCircle />
          </Link>
        </div>
        {convo && convo.messages && convo.messages.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {convo.messages.slice(-3).map((m, i) => (
              <div key={i} className={`bubble ${m.from === "me" ? "me" : "them"}`} style={{ maxWidth: "70%" }}>
                {m.text}
                <span className="b-time">{m.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--gray)", fontSize: 14 }}>No messages yet — say hello to start coordinating!</p>
        )}
      </div>
    </>
  );
}