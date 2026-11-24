import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiRepeat, FiCheckCircle, FiMessageCircle, FiCalendar, FiAward,
  FiStar, FiSlash, FiXCircle, FiTrash2, FiCheck, FiBell
} from "react-icons/fi";
import {
  markAllRead,
  markRead,
  deleteNotificationLocal,
  fetchNotificationsAsync,
  markNotificationReadAsync,
  markAllNotificationsReadAsync,
  deleteNotificationAsync,
  clearAllNotificationsAsync,
} from "../../redux/slices/notificationSlice";
import EmptyState from "../../components/EmptyState";

const TYPE_CONFIG = {
  request: { icon: FiRepeat, label: "Exchange Proposal", color: "#F7C843" },
  accepted: { icon: FiCheckCircle, label: "Exchange Accepted", color: "#16a34a" },
  rejected: { icon: FiXCircle, label: "Exchange Declined", color: "#dc2626" },
  cancelled: { icon: FiSlash, label: "Exchange Cancelled", color: "#9ca3af" },
  message: { icon: FiMessageCircle, label: "Direct Message", color: "#2563eb" },
  session: { icon: FiCalendar, label: "Learning Session", color: "#d97706" },
  completed: { icon: FiAward, label: "Milestone Completed", color: "#8b5cf6" },
  review: { icon: FiStar, label: "Review & Feedback", color: "#eab308" },
  profile_updated: { icon: FiCheckCircle, label: "Profile Update", color: "#16a34a" },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "requests", label: "Exchange Requests" },
  { key: "messages", label: "Messages" },
  { key: "sessions", label: "Sessions" },
  { key: "other", label: "Reviews & Other" },
];

export default function Notifications() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const items = useSelector((s) => s.notifications.items || []);
  const unreadCount = useSelector((s) => s.notifications.unreadCount ?? items.filter((n) => !n.read).length);

  const [tab, setTab] = useState("all");
  const [clearing, setClearing] = useState(false);

  // 1. Initial Fetch and Light Polling (10s interval, cleaned up on unmount)
  useEffect(() => {
    dispatch(fetchNotificationsAsync());
    const pollInterval = setInterval(() => {
      dispatch(fetchNotificationsAsync());
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [dispatch]);

  // 2. Mark All as Read
  const handleMarkAll = async () => {
    dispatch(markAllRead());
    await dispatch(markAllNotificationsReadAsync());
  };

  // 3. Clear All Notifications
  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear all your notifications? This cannot be undone.")) {
      setClearing(true);
      try {
        await dispatch(clearAllNotificationsAsync());
      } finally {
        setClearing(false);
      }
    }
  };

  // 4. Mark Single Notification and Navigate
  const handleClickNotification = async (n) => {
    const nid = n._id || n.id;
    if (!n.read) {
      dispatch(markRead(nid));
      dispatch(markNotificationReadAsync(nid));
    }

    if (n.link && n.link.trim()) {
      navigate(n.link.trim());
    }
  };

  // 5. Delete Single Notification
  const handleDelete = async (e, n) => {
    e.stopPropagation();
    const nid = n._id || n.id;
    dispatch(deleteNotificationLocal(nid));
    await dispatch(deleteNotificationAsync(nid));
  };

  // 6. Filter items based on active tab
  const filteredItems = items.filter((n) => {
    if (tab === "unread") return !n.read;
    if (tab === "requests") return ["request", "accepted", "rejected", "cancelled"].includes(n.type);
    if (tab === "messages") return n.type === "message";
    if (tab === "sessions") return ["session", "completed"].includes(n.type);
    if (tab === "other") return ["review", "profile_updated"].includes(n.type) || !["request", "accepted", "rejected", "cancelled", "message", "session", "completed"].includes(n.type);
    return true;
  });

  return (
    <>
      {/* Header */}
      <div
        className="page-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div>
          <h1>Notifications Center</h1>
          <p>
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
              : "You're all caught up! No unread notifications."}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleMarkAll}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FiCheck /> Mark all as read
            </button>
          )}

          {items.length > 0 && (
            <button
              type="button"
              className="btn-xs danger"
              onClick={handleClearAll}
              disabled={clearing}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "8px 14px",
                borderRadius: 8,
              }}
            >
              <FiTrash2 /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map((t) => {
          let count = 0;
          if (t.key === "all") count = items.length;
          else if (t.key === "unread") count = unreadCount;
          else if (t.key === "requests") count = items.filter((n) => ["request", "accepted", "rejected", "cancelled"].includes(n.type)).length;
          else if (t.key === "messages") count = items.filter((n) => n.type === "message").length;
          else if (t.key === "sessions") count = items.filter((n) => ["session", "completed"].includes(n.type)).length;
          else if (t.key === "other") count = items.filter((n) => ["review", "profile_updated"].includes(n.type) || !["request", "accepted", "rejected", "cancelled", "message", "session", "completed"].includes(n.type)).length;

          return (
            <button
              key={t.key}
              type="button"
              className={`tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <EmptyState
          doodle="chat"
          title="No notifications yet"
          text="When peers propose skill swaps, message you, or schedule learning sessions, your live alerts will appear here."
          actionLabel="Explore Skills on Discover"
          onAction={() => navigate("/discover")}
        />
      ) : filteredItems.length === 0 ? (
        <div className="dash-panel" style={{ textAlign: "center", padding: "40px 20px" }}>
          <FiBell style={{ fontSize: 36, color: "var(--gray)", marginBottom: 10 }} />
          <h4 style={{ margin: "0 0 6px", fontSize: 16 }}>No notifications in this filter</h4>
          <p style={{ margin: 0, color: "var(--gray)", fontSize: 13.5 }}>
            Switch to the &ldquo;All&rdquo; tab to view your complete notification history.
          </p>
        </div>
      ) : (
        /* Notifications List */
        <div className="notif-list">
          {filteredItems.map((n) => {
            const nid = n._id || n.id;
            const config = TYPE_CONFIG[n.type] || { icon: FiCalendar, label: "Notification", color: "#F7C843" };
            const IconComponent = config.icon;

            return (
              <div
                key={nid}
                className={`notif ${n.read ? "" : "unread"}`}
                onClick={() => handleClickNotification(n)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  transition: "background 0.2s ease",
                }}
              >
                {/* Left: Avatar or Icon */}
                <div style={{ display: "flex", gap: 14, flex: 1, minWidth: 0, alignItems: "flex-start" }}>
                  {n.senderPhoto ? (
                    <img
                      src={n.senderPhoto}
                      alt={n.senderName || "Member"}
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
                      }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #fff",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <span className="notif-icon">
                      <IconComponent />
                    </span>
                  )}

                  <div className="notif-body">
                    <div className="notif-title" style={{ flexWrap: "wrap", gap: 8 }}>
                      <span>{n.title}</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 8,
                          background: "var(--cream)",
                          border: "1px solid var(--border)",
                          color: "var(--ink)",
                        }}
                      >
                        {config.label}
                      </span>
                      {!n.read && <span className="unread-dot" title="Unread" />}
                    </div>
                    <div className="notif-text" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                      {n.text}
                    </div>
                  </div>
                </div>

                {/* Right: Timestamp and Delete Button */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <span className="notif-time">{n.time}</span>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, n)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--gray)",
                      padding: 4,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      transition: "color 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gray)")}
                    title="Delete notification"
                    aria-label="Delete notification"
                  >
                    <FiTrash2 style={{ fontSize: 15 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
