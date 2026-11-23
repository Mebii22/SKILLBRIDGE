import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiRepeat, FiCheckCircle, FiMessageCircle, FiCalendar, FiAward } from "react-icons/fi";
import {
  markAllRead,
  markRead,
  fetchNotificationsAsync,
  markNotificationReadAsync,
  markAllNotificationsReadAsync,
} from "../../redux/slices/notificationSlice";

const ICONS = {
  request: FiRepeat,
  accepted: FiCheckCircle,
  message: FiMessageCircle,
  session: FiCalendar,
  completed: FiAward,
  profile_updated: FiCheckCircle,
};

export default function Notifications() {
  const items = useSelector((s) => s.notifications.items);
  const dispatch = useDispatch();
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    dispatch(fetchNotificationsAsync());
  }, [dispatch]);

  const handleMarkAll = () => {
    dispatch(markAllRead());
    dispatch(markAllNotificationsReadAsync());
  };

  const handleMarkOne = (n) => {
    dispatch(markRead(n.id));
    dispatch(markNotificationReadAsync(n._id || n.id));
  };

  return (
    <>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Notifications</h1>
          <p>{unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}.` : "You're all caught up!"}</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-outline btn-sm" onClick={handleMarkAll}>Mark all as read</button>
        )}
      </div>

      <div className="notif-list">
        {items.map((n) => {
          const Icon = ICONS[n.type] || FiCalendar;
          return (
            <div
              key={n._id || n.id}
              className={`notif ${n.read ? "" : "unread"}`}
              onClick={() => handleMarkOne(n)}
              style={{ cursor: "pointer" }}
            >
              <span className="notif-icon"><Icon /></span>
              <div className="notif-body">
                <div className="notif-title">
                  {n.title}
                  {!n.read && <span className="unread-dot" />}
                </div>
                <div className="notif-text">{n.text}</div>
              </div>
              <span className="notif-time">{n.time}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
